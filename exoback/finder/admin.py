from django.contrib import admin
from .models import *

# Register your models here.

@admin.register(CustomUser)
class CustomUserAdmin(admin.ModelAdmin):
    pass

@admin.register(Exoplanets)
class Exoplanet(admin.ModelAdmin):
    pass

@admin.register(ExoplanetsNoob)
class ExoplanetNoob(admin.ModelAdmin):
    pass