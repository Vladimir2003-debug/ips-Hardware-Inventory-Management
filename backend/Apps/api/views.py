import io
from decimal import Decimal

from django.db.models import Sum
from django.http import FileResponse
from django.utils.dateparse import parse_date
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.db.models.deletion import ProtectedError

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet

from Apps.inventario.models import (
    Producto, Inventario, Cliente, Proveedor,
    Venta, DetalleVenta, Compra, DetalleCompra,
    HistorialMovimientos,
)
from Apps.login.models import User
from .serializers import (
    UserSerializer, ProductoSerializer, InventarioSerializer,
    ClienteSerializer, ProveedorSerializer,
    VentaSerializer, CompraSerializer,
    HistorialMovimientosSerializer,
)


# ────────────────────────────────────────────────────────────────
# Helpers
# ────────────────────────────────────────────────────────────────
def _pdf_response(buffer, filename):
    buffer.seek(0)
    return FileResponse(buffer, as_attachment=True, filename=filename,
                        content_type='application/pdf')


def _build_pdf(title, headers, rows):
    """Genera un PDF con tabla y retorna el buffer."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4,
                            leftMargin=30, rightMargin=30, topMargin=40, bottomMargin=30)
    styles = getSampleStyleSheet()
    elements = [
        Paragraph(title, styles['Title']),
        Spacer(1, 12),
    ]
    data = [headers] + rows
    table = Table(data, repeatRows=1)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2563eb')),
        ('TEXTCOLOR',  (0, 0), (-1, 0), colors.white),
        ('FONTNAME',   (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE',   (0, 0), (-1, 0), 9),
        ('ALIGN',      (0, 0), (-1, -1), 'CENTER'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f0f4ff')]),
        ('GRID',       (0, 0), (-1, -1), 0.4, colors.grey),
        ('FONTSIZE',   (0, 1), (-1, -1), 8),
    ]))
    elements.append(table)
    doc.build(elements)
    return buffer


# ────────────────────────────────────────────────────────────────
# Users
# ────────────────────────────────────────────────────────────────
class UserViewSet(viewsets.ModelViewSet):
    queryset           = User.objects.all().order_by('id')
    serializer_class   = UserSerializer
    permission_classes = [permissions.IsAuthenticated]


# ────────────────────────────────────────────────────────────────
# Productos
# ────────────────────────────────────────────────────────────────
class ProductoViewSet(viewsets.ModelViewSet):
    queryset           = Producto.objects.all().order_by('nombre')
    serializer_class   = ProductoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs       = super().get_queryset()
        location = self.request.query_params.get('location')
        search   = self.request.query_params.get('search')
        low      = self.request.query_params.get('low_stock')
        if location:
            qs = qs.filter(location=location)
        if search:
            qs = qs.filter(nombre__icontains=search)
        if low in ('true', '1'):
            from django.db.models import F
            qs = qs.filter(stock__lte=F('low_stock_threshold'))
        return qs

    def destroy(self, request, *args, **kwargs):
        """Evitar errores 500 al borrar productos con relaciones protegidas."""
        instance = self.get_object()
        try:
            self.perform_destroy(instance)
        except ProtectedError:
            return Response(
                {
                    'detail': (
                        'No se puede eliminar el producto porque tiene ventas, compras '
                        'u otros registros asociados.'
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)


# ────────────────────────────────────────────────────────────────
# Inventario
# ────────────────────────────────────────────────────────────────
class InventarioViewSet(viewsets.ReadOnlyModelViewSet):
    queryset           = Producto.objects.all().order_by('nombre')
    serializer_class   = ProductoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request, *args, **kwargs):
        location = request.query_params.get('location')
        qs = self.get_queryset()
        if location:
            qs = qs.filter(location=location)
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        producto = get_object_or_404(Producto, pk=pk)
        return Response(ProductoSerializer(producto).data)

    @action(detail=False, methods=['post'], url_path='adjust')
    def adjust(self, request):
        product_id    = request.data.get('product_id')
        quantity      = request.data.get('quantity')
        movement_type = request.data.get('movement_type', 'Adjustment')

        if product_id is None or quantity is None:
            return Response({'error': 'product_id and quantity are required.'},
                            status=status.HTTP_400_BAD_REQUEST)

        try:
            quantity_int = int(quantity)
        except (TypeError, ValueError):
            return Response({'error': 'quantity must be an integer.'},
                            status=status.HTTP_400_BAD_REQUEST)

        try:
            producto = Producto.objects.get(pk=product_id)
        except Producto.DoesNotExist:
            return Response({'error': 'Product not found.'}, status=status.HTTP_404_NOT_FOUND)

        with transaction.atomic():
            producto = Producto.objects.select_for_update().get(pk=producto.pk)

            # Evitar stock negativo
            if quantity_int < 0 and producto.stock + quantity_int < 0:
                return Response(
                    {'error': 'Stock insuficiente para realizar el ajuste.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            producto.stock += quantity_int
            producto.save()
            HistorialMovimientos.objects.create(
                producto=producto,
                tipo_movimiento='ajuste',
                cantidad=quantity_int,
                stock_resultante=producto.stock,
                usuario=request.user,
                detalles=movement_type,
            )
            return Response(ProductoSerializer(producto).data)


# ────────────────────────────────────────────────────────────────
# Ventas
# ────────────────────────────────────────────────────────────────
class VentaViewSet(viewsets.ModelViewSet):
    queryset           = Venta.objects.prefetch_related('detalles__producto').select_related('cliente').order_by('-fecha')
    serializer_class   = VentaSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names  = ['get', 'post', 'delete', 'head', 'options']

    def get_queryset(self):
        qs    = super().get_queryset()
        desde = self.request.query_params.get('desde')
        hasta = self.request.query_params.get('hasta')
        if desde:
            desde_date = parse_date(desde)
            if desde_date:
                qs = qs.filter(fecha__date__gte=desde_date)
        if hasta:
            qs = qs.filter(fecha__date__lte=parse_date(hasta))
        return qs

    def destroy(self, request, *args, **kwargs):
        """Eliminar venta devuelve el stock."""
        with transaction.atomic():
            venta = self.get_object()
            for det in venta.detalles.select_related('producto').all():
                producto = Producto.objects.select_for_update().get(pk=det.producto_id)
                producto.stock += det.cantidad
                producto.save()
                HistorialMovimientos.objects.create(
                    producto=producto,
                    tipo_movimiento='ajuste',
                    cantidad=det.cantidad,
                    stock_resultante=producto.stock,
                    usuario=request.user,
                    detalles=f"Anulación venta #{venta.pk}",
                )
            venta.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)


# ────────────────────────────────────────────────────────────────
# Compras
# ────────────────────────────────────────────────────────────────
class CompraViewSet(viewsets.ModelViewSet):
    queryset           = Compra.objects.prefetch_related('detalles__producto').select_related('proveedor').order_by('-fecha')
    serializer_class   = CompraSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names  = ['get', 'post', 'delete', 'head', 'options']

    def get_queryset(self):
        qs    = super().get_queryset()
        desde = self.request.query_params.get('desde')
        hasta = self.request.query_params.get('hasta')
        if desde:
            desde_date = parse_date(desde)
            if desde_date:
                qs = qs.filter(fecha__date__gte=desde_date)
        if hasta:
            hasta_date = parse_date(hasta)
            if hasta_date:
                qs = qs.filter(fecha__date__lte=hasta_date)
        return qs

    def destroy(self, request, *args, **kwargs):
        """Eliminar compra descuenta el stock."""
        with transaction.atomic():
            compra = self.get_object()
            for det in compra.detalles.select_related('producto').all():
                producto = Producto.objects.select_for_update().get(pk=det.producto_id)
                producto.stock -= det.cantidad
                producto.save()
                HistorialMovimientos.objects.create(
                    producto=producto,
                    tipo_movimiento='ajuste',
                    cantidad=-det.cantidad,
                    stock_resultante=producto.stock,
                    usuario=request.user,
                    detalles=f"Anulación compra #{compra.pk}",
                )
            compra.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)


# ────────────────────────────────────────────────────────────────
# Clientes / Proveedores
# ────────────────────────────────────────────────────────────────
class ClienteViewSet(viewsets.ModelViewSet):
    queryset           = Cliente.objects.all().order_by('nombre')
    serializer_class   = ClienteSerializer
    permission_classes = [permissions.IsAuthenticated]


class ProveedorViewSet(viewsets.ModelViewSet):
    queryset           = Proveedor.objects.all().order_by('nombre')
    serializer_class   = ProveedorSerializer
    permission_classes = [permissions.IsAuthenticated]


# ────────────────────────────────────────────────────────────────
# Historial
# ────────────────────────────────────────────────────────────────
class HistorialViewSet(viewsets.ReadOnlyModelViewSet):
    queryset           = HistorialMovimientos.objects.select_related('producto', 'usuario').order_by('-fecha')
    serializer_class   = HistorialMovimientosSerializer
    permission_classes = [permissions.IsAuthenticated]


# ────────────────────────────────────────────────────────────────
# Reportes
# ────────────────────────────────────────────────────────────────
class ReportesView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def _filtrar_fechas(self, qs, date_field='fecha'):
        desde = self.request.query_params.get('desde')
        hasta = self.request.query_params.get('hasta')
        filtro = {}
        if desde:
            desde_date = parse_date(desde)
            if desde_date:
                filtro[f'{date_field}__date__gte'] = desde_date
        if hasta:
            hasta_date = parse_date(hasta)
            if hasta_date:
                filtro[f'{date_field}__date__lte'] = hasta_date
        return qs.filter(**filtro) if filtro else qs


class ReporteSalesView(ReportesView):
    def get(self, request):
        ventas = self._filtrar_fechas(Venta.objects.all())
        total  = ventas.aggregate(total=Sum('total'))['total'] or 0
        data   = VentaSerializer(ventas, many=True).data
        return Response({'total_ventas': total, 'count': ventas.count(), 'ventas': data})


class ReportePurchasesView(ReportesView):
    def get(self, request):
        compras = self._filtrar_fechas(Compra.objects.all())
        total   = compras.aggregate(total=Sum('total'))['total'] or 0
        data    = CompraSerializer(compras, many=True).data
        return Response({'total_compras': total, 'count': compras.count(), 'compras': data})


class ReporteFinancialView(ReportesView):
    def get(self, request):
        ventas  = self._filtrar_fechas(Venta.objects.all())
        compras = self._filtrar_fechas(Compra.objects.all())
        t_v = ventas.aggregate(t=Sum('total'))['t'] or Decimal('0')
        t_c = compras.aggregate(t=Sum('total'))['t'] or Decimal('0')
        return Response({
            'total_ventas':  t_v,
            'total_compras': t_c,
            'ganancia_neta': t_v - t_c,
        })


# ────────────────────────────────────────────────────────────────
# PDF
# ────────────────────────────────────────────────────────────────
class PDFSalesView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        ventas  = Venta.objects.select_related('cliente').order_by('-fecha')
        headers = ['ID', 'Fecha', 'Cliente', 'Total (S/)']
        rows    = [[str(v.pk), str(v.fecha)[:10], v.cliente.nombre, str(v.total)] for v in ventas]
        buf     = _build_pdf('Reporte de Ventas', headers, rows)
        return _pdf_response(buf, 'ventas.pdf')


class PDFPurchasesView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        compras = Compra.objects.select_related('proveedor').order_by('-fecha')
        headers = ['ID', 'Fecha', 'Proveedor', 'Total (S/)']
        rows    = [[str(c.pk), str(c.fecha)[:10], c.proveedor.nombre, str(c.total)] for c in compras]
        buf     = _build_pdf('Reporte de Compras', headers, rows)
        return _pdf_response(buf, 'compras.pdf')


class PDFInventoryHistoryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        hist    = HistorialMovimientos.objects.select_related('producto').order_by('-fecha')
        headers = ['ID', 'Fecha', 'Producto', 'Tipo', 'Cantidad', 'Stock Resultante']
        rows    = [[str(h.pk), str(h.fecha)[:10], h.producto.nombre,
                    h.tipo_movimiento, str(h.cantidad), str(h.stock_resultante)]
                   for h in hist]
        buf     = _build_pdf('Historial de Movimientos de Inventario', headers, rows)
        return _pdf_response(buf, 'historial_inventario.pdf')
