from django.contrib import admin

from .models import (
    Producto, Inventario, HistorialMovimientos,
    Cliente, Proveedor,
    Venta, DetalleVenta,
    Compra, DetalleCompra,
    ReporteVentas, ReporteCompras,
)

admin.site.register(Producto)
admin.site.register(Inventario)
admin.site.register(HistorialMovimientos)
admin.site.register(Cliente)
admin.site.register(Proveedor)
admin.site.register(Venta)
admin.site.register(DetalleVenta)
admin.site.register(Compra)
admin.site.register(DetalleCompra)
admin.site.register(ReporteVentas)
admin.site.register(ReporteCompras)
