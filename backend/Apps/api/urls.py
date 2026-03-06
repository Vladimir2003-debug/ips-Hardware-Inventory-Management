from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import (
    UserViewSet, ProductoViewSet, InventarioViewSet,
    VentaViewSet, CompraViewSet,
    ClienteViewSet, ProveedorViewSet, HistorialViewSet,
    ReporteSalesView, ReportePurchasesView, ReporteFinancialView,
    PDFSalesView, PDFPurchasesView, PDFInventoryHistoryView,
)

router = DefaultRouter()
# Aceptar URLs con y sin slash final (ej: /products y /products/)
router.trailing_slash = '/?'
router.register(r'users',     UserViewSet,     basename='users')
router.register(r'products',  ProductoViewSet, basename='products')
router.register(r'inventory', InventarioViewSet, basename='inventory')
router.register(r'sales',     VentaViewSet,    basename='sales')
router.register(r'purchases', CompraViewSet,   basename='purchases')
router.register(r'customers', ClienteViewSet,  basename='customers')
router.register(r'suppliers', ProveedorViewSet, basename='suppliers')
router.register(r'history',   HistorialViewSet, basename='history')

urlpatterns = [
    # Auth JWT
    path('auth/login',   TokenObtainPairView.as_view(),  name='token_obtain'),
    path('auth/login/',  TokenObtainPairView.as_view(),  name='token_obtain_slash'),
    path('auth/refresh', TokenRefreshView.as_view(),     name='token_refresh'),
    path('auth/refresh/', TokenRefreshView.as_view(),    name='token_refresh_slash'),

    # REST Router
    path('', include(router.urls)),

    # Reports
    path('reports/sales/',      ReporteSalesView.as_view(),      name='report-sales'),
    path('reports/purchases/',  ReportePurchasesView.as_view(),  name='report-purchases'),
    path('reports/financial/',  ReporteFinancialView.as_view(),  name='report-financial'),

    # PDF
    path('pdf/sales/',              PDFSalesView.as_view(),           name='pdf-sales'),
    path('pdf/purchases/',          PDFPurchasesView.as_view(),       name='pdf-purchases'),
    path('pdf/inventory-history/',  PDFInventoryHistoryView.as_view(), name='pdf-inventory'),
]
