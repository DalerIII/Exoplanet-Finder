from django.db import models
from django.contrib.auth.models import AbstractUser
from .managers import CustomUserManager

class CustomUser(AbstractUser):
    USERNAME_FIELD = 'email'
    email = models.EmailField(unique=True)
    username = models.CharField(unique=True, max_length=20)
    REQUIRED_FIELDS = ["username"]

    objects = CustomUserManager()

    def __str__(self):
        return self.email
    

class Exoplanets(models.Model):
    period = models.FloatField()
    duration = models.FloatField()
    depth = models.FloatField()
    prad = models.FloatField()
    steff = models.FloatField()
    srad = models.FloatField()
    mag = models.FloatField()
    disposition = models.CharField(max_length=100)
    user = models.ForeignKey(CustomUser, null=True, blank=True, on_delete=models.SET_NULL)

class ExoplanetsNoob(models.Model):
    period = models.FloatField()
    duration = models.FloatField()
    depth = models.FloatField()
    kepmag = models.FloatField()
    disposition = models.CharField(max_length=100)
    user = models.ForeignKey(CustomUser, null=True, blank=True, on_delete=models.SET_NULL)