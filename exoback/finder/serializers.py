from rest_framework.serializers import ModelSerializer, Serializer
from .models import CustomUser
from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import *

class CustomUserSerializer(ModelSerializer):
    
    class Meta:
        model = CustomUser
        fields = ("id", "email", "username")

class CustomRegisterUserSerializer(ModelSerializer):

    class Meta():
        model = CustomUser
        fields = ("email", "username", "password")
        extra_kwargs = {"password":{"write_only": True}}

    def create(self, validated_data):
        user = CustomUser.objects.create_user(**validated_data)
        return user
    
class LoginUserSerializer(Serializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(required=True, write_only=True)

    def validate(self, data):
        user = authenticate(**data)
        if user and user.is_active:
            return user
        raise serializers.ValidationError("Incorrect credentials.")

class PredictRequestSerializer(serializers.Serializer):
    period = serializers.FloatField()
    duration = serializers.FloatField()
    depth = serializers.FloatField()
    prad = serializers.FloatField()
    steff = serializers.FloatField()
    srad = serializers.FloatField()
    mag = serializers.FloatField()

class PredictNoobRequestSerializer(serializers.Serializer):
    period = serializers.FloatField()
    duration = serializers.FloatField()
    depth = serializers.FloatField()
    mag = serializers.FloatField()

class ExoplanetsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Exoplanets
        fields = "__all__"


class ExoplanetsNoobSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExoplanetsNoob
        fields = "__all__"