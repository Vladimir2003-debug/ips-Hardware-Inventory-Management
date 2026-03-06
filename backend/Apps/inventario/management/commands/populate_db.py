from django.core.management.base import BaseCommand
import random
from datetime import timedelta
from django.utils import timezone
from Apps.login.models import User
from Apps.inventario.models import Cliente, Proveedor, Producto, Venta, DetalleVenta, Compra, DetalleCompra, HistorialMovimientos

class Command(BaseCommand):
    help = 'Populates the database with mock data for testing.'

    def handle(self, *args, **kwargs):
        self.stdout.write('Deleting old data...')
        Venta.objects.all().delete()
        Compra.objects.all().delete()
        DetalleVenta.objects.all().delete()
        DetalleCompra.objects.all().delete()
        HistorialMovimientos.objects.all().delete()
        Cliente.objects.all().delete()
        Proveedor.objects.all().delete()
        Producto.objects.all().delete()

        admin = User.objects.filter(username='admin').first()
        if not admin:
            admin = User.objects.create_user(username='admin', password='password', role='Administrator', location='Local 1')
            self.stdout.write('Created generic admin user (admin/password)')

        self.stdout.write('Creating Clientes...')
        clientes = []
        for i in range(10):
            c = Cliente.objects.create(
                nombre=f'Cliente {i+1}',
                direccion=f'Av. Principal {random.randint(100, 999)}',
                telefono=f'999{random.randint(100000, 999999)}',
                email=f'cliente{i+1}@ejemplo.com'
            )
            clientes.append(c)

        self.stdout.write('Creating Proveedores...')
        proveedores = []
        for i in range(5):
            p = Proveedor.objects.create(
                nombre=f'Proveedor Industrial {i+1} SAC',
                direccion=f'Parque Industrial Mz {chr(65+i)} Lote {random.randint(1, 20)}',
                telefono=f'054-{random.randint(100000, 999999)}',
                email=f'ventas@proveedor{i+1}.com'
            )
            proveedores.append(p)

        self.stdout.write('Creating Productos...')
        productos_data = [
            ('Cemento Sol', 'Bolsa de 42.5kg', 28.50, 150, 20),
            ('Cemento Yura', 'Bolsa de 42.5kg', 29.00, 100, 15),
            ('Ladrillo King Kong', 'Millar de ladrillo 18 huecos', 350.00, 5, 2),
            ('Fierro Corrugado 1/2"', 'Varilla de 9 metros', 32.00, 200, 30),
            ('Fierro Corrugado 3/8"', 'Varilla de 9 metros', 18.50, 300, 50),
            ('Alambre Recocido N°16', 'Rollo de 100Kg', 4.50, 80, 10),
            ('Clavos para Madera 3"', 'Caja de 25Kg', 5.00, 40, 5),
            ('Pintura Látex Vencedor', 'Balde 4L Blanco', 45.00, 25, 5),
            ('Tubo PVC Agua 1/2"', 'Tubo simple 3m', 12.00, 120, 20),
            ('Pegamento Oatey PVC', 'Frasco 1/4 galón', 22.00, 15, 3),
        ]
        productos = []
        for nom, desc, precio, stock, umbral in productos_data:
            loc = random.choice(['Local 1', 'Local 2'])
            p = Producto.objects.create(
                nombre=nom,
                descripcion=desc,
                precio=precio,
                stock=stock,
                low_stock_threshold=umbral,
                location=loc
            )
            productos.append(p)

        self.stdout.write('Creating Ventas and Compras with History...')
        now = timezone.now()
        
        # Compras
        for _ in range(15):
            fecha = now - timedelta(days=random.randint(1, 180))
            proveedor = random.choice(proveedores)
            compra = Compra.objects.create(proveedor=proveedor, fecha=fecha, total=0)
            
            total = 0
            for _ in range(random.randint(1, 4)):
                p = random.choice(productos)
                qty = random.randint(10, 50)
                price = p.precio * 0.8 # precio de compra inferior al de venta
                
                DetalleCompra.objects.create(
                    compra=compra, producto=p, cantidad=qty, precio_unit=price
                )
                total += qty * price
                p.stock += qty
                p.save()
                
                HistorialMovimientos.objects.create(
                    producto=p, tipo_movimiento='compra', cantidad=qty,
                    stock_resultante=p.stock, usuario=admin, detalles=f'Compra #{compra.id}',
                    fecha=fecha
                )
            
            compra.total = total
            compra.save()

        # Ventas
        for _ in range(40):
            fecha = now - timedelta(days=random.randint(1, 180))
            cliente = random.choice(clientes)
            venta = Venta.objects.create(cliente=cliente, fecha=fecha, total=0)
            
            total = 0
            for _ in range(random.randint(1, 5)):
                p = random.choice(productos)
                qty = random.randint(1, 15)
                # avoid negative stock for logic consistency
                if p.stock < qty:
                    qty = p.stock
                if qty == 0:
                    continue
                
                DetalleVenta.objects.create(
                    venta=venta, producto=p, cantidad=qty, precio_unit=p.precio
                )
                total += qty * p.precio
                p.stock -= qty
                p.save()
                
                HistorialMovimientos.objects.create(
                    producto=p, tipo_movimiento='venta', cantidad=-qty,
                    stock_resultante=p.stock, usuario=admin, detalles=f'Venta #{venta.id}',
                    fecha=fecha
                )
            
            if total > 0:
                venta.total = total
                venta.save()
            else:
                venta.delete()

        # Ajustes manuales aleatorios simulados para dejar algunos en stock bajo
        for p in random.sample(productos, 3):
            qty = random.randint(-10, -1)
            if p.stock + qty >= 0:
                p.stock += qty
                p.save()
                HistorialMovimientos.objects.create(
                    producto=p, tipo_movimiento='ajuste', cantidad=qty,
                    stock_resultante=p.stock, usuario=admin, detalles='Ajuste de inventario por merma',
                    fecha=now - timedelta(days=random.randint(1, 5))
                )

        self.stdout.write(self.style.SUCCESS('Successfully populated database with mock data.'))
