from django.db import models
from django.contrib.auth.models import User,AbstractUser 
import uuid

# Create your models here.

GENDER_CHOICES = (
    ("M", "Masculino"),
    ("F", "Femenino"),
)


def user_directory_path(instance, filename):
    # MEDIA_ROOT/user_<id>/<filename>
    user_id = instance.pk or "temp"
    return f"user_{user_id}/{filename}"


def store_directory_path(instance, filename):
    # MEDIA_ROOT/store_<usuario_id>/<filename>
    usuario_id = getattr(instance, "usuario_id", None) or getattr(
        instance, "usuario", None
    )
    if hasattr(usuario_id, "pk"):
        usuario_id = usuario_id.pk
    usuario_id = usuario_id or "temp"
    return f"store_{usuario_id}/{filename}"

class User(AbstractUser):
    
    phone_number = models.IntegerField(default=0)
    country = models.CharField(max_length=100,default="Peru")
    address = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    birthday = models.DateField(auto_now=True)
    perfil_image = models.ImageField(default="", upload_to=user_directory_path)

    gender = models.TextField(choices=GENDER_CHOICES, default="M")

class Store(models.Model):
    name = models.CharField(max_length=100)
    address = models.CharField(max_length=100)
    phone_number = models.IntegerField()
    description = models.TextField(blank=True)
    image = models.ImageField(default="", upload_to=store_directory_path,blank=True)
    usuario = models.ForeignKey(User, on_delete=models.CASCADE)
    inventario = models.ForeignKey('inventario.Inventario',on_delete=models.CASCADE,blank=True)