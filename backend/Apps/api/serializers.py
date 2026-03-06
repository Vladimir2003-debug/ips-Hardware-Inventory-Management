from decimal import Decimal
from rest_framework import serializers
from django.db import transaction
from Apps.inventario.models import (
    Producto, Inventario, Cliente, Proveedor,
    Venta, DetalleVenta, Compra, DetalleCompra,
    HistorialMovimientos, ReporteVentas, ReporteCompras,
)
from Apps.login.models import User


# ────────────────────────────────────────────────────────────────
# User
# ────────────────────────────────────────────────────────────────
class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model  = User
        fields = ['id', 'username', 'email', 'password', 'first_name', 'last_name',
                  'phone_number', 'country', 'address', 'is_staff', 'is_active']

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


# ────────────────────────────────────────────────────────────────
# Producto
# ────────────────────────────────────────────────────────────────
class ProductoSerializer(serializers.ModelSerializer):
    low_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model  = Producto
        fields = ['id', 'nombre', 'descripcion', 'precio', 'stock',
                  'low_stock_threshold', 'location', 'low_stock']


# ────────────────────────────────────────────────────────────────
# Inventario
# ────────────────────────────────────────────────────────────────
class InventarioSerializer(serializers.ModelSerializer):
    productos = ProductoSerializer(many=True, read_only=True)

    class Meta:
        model  = Inventario
        fields = ['id', 'productos']


# ────────────────────────────────────────────────────────────────
# Cliente / Proveedor
# ────────────────────────────────────────────────────────────────
class ClienteSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Cliente
        fields = ['id', 'nombre', 'direccion', 'telefono', 'email']


class ProveedorSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Proveedor
        fields = ['id', 'nombre', 'direccion', 'telefono', 'email']


# ────────────────────────────────────────────────────────────────
# Venta
# ────────────────────────────────────────────────────────────────
class DetalleVentaSerializer(serializers.ModelSerializer):
    cantidad = serializers.IntegerField(min_value=1)
    precio_unit = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('0'))
    subtotal = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model  = DetalleVenta
        fields = ['id', 'producto', 'cantidad', 'precio_unit', 'subtotal']


class VentaSerializer(serializers.ModelSerializer):
    detalles = DetalleVentaSerializer(many=True)
    cliente_nombre = serializers.CharField(source='cliente.nombre', read_only=True)

    class Meta:
        model  = Venta
        fields = ['id', 'cliente', 'cliente_nombre', 'fecha', 'total', 'detalles']
        read_only_fields = ['total', 'fecha']

    def create(self, validated_data):
        request = self.context.get('request')
        user = getattr(request, 'user', None)

        detalles_data = validated_data.pop('detalles')
        with transaction.atomic():
            venta = Venta.objects.create(**validated_data)
            total = Decimal('0')

            for det in detalles_data:
                producto_id = det['producto'].pk
                cantidad = det['cantidad']

                producto = Producto.objects.select_for_update().get(pk=producto_id)
                if producto.stock < cantidad:
                    raise serializers.ValidationError(
                        {
                            'detalle': f'Stock insuficiente para {producto.nombre}. '
                                       f'Disponible: {producto.stock}, solicitado: {cantidad}'
                        }
                    )

                dv = DetalleVenta.objects.create(
                    venta=venta,
                    producto=producto,
                    cantidad=cantidad,
                    precio_unit=det['precio_unit'],
                )

                subtotal = dv.cantidad * dv.precio_unit
                total += subtotal

                producto.stock -= dv.cantidad
                producto.save()

                HistorialMovimientos.objects.create(
                    producto=producto,
                    tipo_movimiento='venta',
                    cantidad=dv.cantidad,
                    stock_resultante=producto.stock,
                    usuario=user if user and getattr(user, 'is_authenticated', False) else None,
                    detalles=f"Venta #{venta.pk}",
                )

            venta.total = total
            venta.save()
            return venta


# ────────────────────────────────────────────────────────────────
# Compra
# ────────────────────────────────────────────────────────────────
class DetalleCompraSerializer(serializers.ModelSerializer):
    cantidad = serializers.IntegerField(min_value=1)
    precio_unit = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('0'))
    subtotal = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model  = DetalleCompra
        fields = ['id', 'producto', 'cantidad', 'precio_unit', 'subtotal']


class CompraSerializer(serializers.ModelSerializer):
    detalles = DetalleCompraSerializer(many=True)
    proveedor_nombre = serializers.CharField(source='proveedor.nombre', read_only=True)

    class Meta:
        model  = Compra
        fields = ['id', 'proveedor', 'proveedor_nombre', 'fecha', 'total', 'detalles']
        read_only_fields = ['total', 'fecha']

    def create(self, validated_data):
        request = self.context.get('request')
        user = getattr(request, 'user', None)

        detalles_data = validated_data.pop('detalles')
        with transaction.atomic():
            compra = Compra.objects.create(**validated_data)
            total = Decimal('0')
            for det in detalles_data:
                producto_id = det['producto'].pk
                cantidad = det['cantidad']

                producto = Producto.objects.select_for_update().get(pk=producto_id)

                dc = DetalleCompra.objects.create(
                    compra=compra,
                    producto=producto,
                    cantidad=cantidad,
                    precio_unit=det['precio_unit'],
                )

                subtotal = dc.cantidad * dc.precio_unit
                total += subtotal

                producto.stock += dc.cantidad
                producto.save()

                HistorialMovimientos.objects.create(
                    producto=producto,
                    tipo_movimiento='compra',
                    cantidad=dc.cantidad,
                    stock_resultante=producto.stock,
                    usuario=user if user and getattr(user, 'is_authenticated', False) else None,
                    detalles=f"Compra #{compra.pk}",
                )

            compra.total = total
            compra.save()
            return compra


# ────────────────────────────────────────────────────────────────
# Historial
# ────────────────────────────────────────────────────────────────
class HistorialMovimientosSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.CharField(source='producto.nombre', read_only=True)
    usuario_nombre  = serializers.CharField(source='usuario.username', read_only=True)

    class Meta:
        model  = HistorialMovimientos
        fields = ['id', 'producto', 'producto_nombre', 'tipo_movimiento',
                  'cantidad', 'stock_resultante', 'fecha', 'usuario', 'usuario_nombre', 'detalles']


# ────────────────────────────────────────────────────────────────
# Reportes
# ────────────────────────────────────────────────────────────────
class ReporteVentasSerializer(serializers.ModelSerializer):
    class Meta:
        model  = ReporteVentas
        fields = '__all__'


class ReporteComprasSerializer(serializers.ModelSerializer):
    class Meta:
        model  = ReporteCompras
        fields = '__all__'
