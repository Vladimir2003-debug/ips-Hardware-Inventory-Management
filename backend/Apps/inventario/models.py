from django.db import models
from Apps.login.models import User

# ────────────────────────────────────────────────────────────────
# Choices
# ────────────────────────────────────────────────────────────────
LOCATION_CHOICES = [
    ('Local 1', 'Local 1'),
    ('Local 2', 'Local 2'),
]

MOVEMENT_CHOICES = [
    ('venta',    'Venta'),
    ('compra',   'Compra'),
    ('ajuste',   'Ajuste'),
]


# ────────────────────────────────────────────────────────────────
# Producto
# ────────────────────────────────────────────────────────────────
class Producto(models.Model):
    nombre              = models.CharField(max_length=200)
    descripcion         = models.TextField(blank=True)
    precio              = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    stock               = models.IntegerField(default=0)
    low_stock_threshold = models.IntegerField(default=10)
    location            = models.CharField(max_length=20, choices=LOCATION_CHOICES, default='Local 1')

    def __str__(self):
        return self.nombre

    @property
    def low_stock(self):
        return self.stock <= self.low_stock_threshold


# ────────────────────────────────────────────────────────────────
# Inventario
# ────────────────────────────────────────────────────────────────
class Inventario(models.Model):
    productos = models.ManyToManyField(Producto, blank=True)

    def __str__(self):
        return f"Inventario #{self.pk}"


# ────────────────────────────────────────────────────────────────
# Cliente
# ────────────────────────────────────────────────────────────────
class Cliente(models.Model):
    nombre    = models.CharField(max_length=200)
    direccion = models.CharField(max_length=200, blank=True)
    telefono  = models.CharField(max_length=20, blank=True)
    email     = models.EmailField(blank=True)

    def __str__(self):
        return self.nombre


# ────────────────────────────────────────────────────────────────
# Proveedor
# ────────────────────────────────────────────────────────────────
class Proveedor(models.Model):
    nombre    = models.CharField(max_length=200)
    direccion = models.CharField(max_length=200, blank=True)
    telefono  = models.CharField(max_length=20, blank=True)
    email     = models.EmailField(blank=True)

    def __str__(self):
        return self.nombre


# ────────────────────────────────────────────────────────────────
# Venta + DetalleVenta
# ────────────────────────────────────────────────────────────────
class Venta(models.Model):
    cliente      = models.ForeignKey(Cliente, on_delete=models.PROTECT, related_name='ventas')
    fecha        = models.DateTimeField(auto_now_add=True)
    total        = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    def __str__(self):
        return f"Venta #{self.pk} – {self.cliente}"


class DetalleVenta(models.Model):
    venta        = models.ForeignKey(Venta, on_delete=models.CASCADE, related_name='detalles')
    producto     = models.ForeignKey(Producto, on_delete=models.PROTECT)
    cantidad     = models.IntegerField()
    precio_unit  = models.DecimalField(max_digits=10, decimal_places=2)

    @property
    def subtotal(self):
        return self.cantidad * self.precio_unit


# ────────────────────────────────────────────────────────────────
# Compra + DetalleCompra
# ────────────────────────────────────────────────────────────────
class Compra(models.Model):
    proveedor    = models.ForeignKey(Proveedor, on_delete=models.PROTECT, related_name='compras')
    fecha        = models.DateTimeField(auto_now_add=True)
    total        = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    def __str__(self):
        return f"Compra #{self.pk} – {self.proveedor}"


class DetalleCompra(models.Model):
    compra       = models.ForeignKey(Compra, on_delete=models.CASCADE, related_name='detalles')
    producto     = models.ForeignKey(Producto, on_delete=models.PROTECT)
    cantidad     = models.IntegerField()
    precio_unit  = models.DecimalField(max_digits=10, decimal_places=2)

    @property
    def subtotal(self):
        return self.cantidad * self.precio_unit


# ────────────────────────────────────────────────────────────────
# Historial de Movimientos
# ────────────────────────────────────────────────────────────────
class HistorialMovimientos(models.Model):
    producto          = models.ForeignKey(Producto, on_delete=models.CASCADE, related_name='movimientos')
    tipo_movimiento   = models.CharField(max_length=20, choices=MOVEMENT_CHOICES)
    cantidad          = models.IntegerField()
    stock_resultante  = models.IntegerField()
    fecha             = models.DateTimeField(auto_now_add=True)
    usuario           = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    detalles          = models.TextField(blank=True)

    def __str__(self):
        return f"{self.tipo_movimiento} – {self.producto} ({self.fecha:%Y-%m-%d})"


# ────────────────────────────────────────────────────────────────
# Reporte (base)
# ────────────────────────────────────────────────────────────────
class ReporteVentas(models.Model):
    fecha_inicio  = models.DateField()
    fecha_fin     = models.DateField()
    total_ventas  = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    ventas        = models.ManyToManyField(Venta, blank=True)

    def __str__(self):
        return f"Reporte Ventas {self.fecha_inicio} → {self.fecha_fin}"


class ReporteCompras(models.Model):
    fecha_inicio   = models.DateField()
    fecha_fin      = models.DateField()
    total_compras  = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    compras        = models.ManyToManyField(Compra, blank=True)

    def __str__(self):
        return f"Reporte Compras {self.fecha_inicio} → {self.fecha_fin}"
