from django.shortcuts import render
from rest_framework.generics import RetrieveUpdateAPIView, CreateAPIView
from rest_framework.permissions import IsAuthenticated
from .serializers import *
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.exceptions import InvalidToken
from .models import Exoplanets, ExoplanetsNoob
import numpy as np
import shap
from rest_framework.generics import ListAPIView
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
import pandas as pd
from rest_framework.parsers import MultiPartParser, FormParser
from django.http import HttpResponse
import joblib

features = ["period","duration","depth","prad","steff","srad","mag"]

# Create your views here.
class UserInfoView(RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]

    serializer_class = CustomUserSerializer

    def get_object(self):
        return self.request.user

class UserRegistrationView(CreateAPIView):
    serializer_class = CustomRegisterUserSerializer


class LoginView(APIView):
    def post(self, request):
        serializer = LoginUserSerializer(data=request.data)

        if serializer.is_valid():
            user = serializer.validated_data
            
            refresh = RefreshToken.for_user(user)
            access_token = str(refresh.access_token)

            response = Response(
                {
                    "user": CustomUserSerializer(user).data
                },
                status=status.HTTP_200_OK
            )

            response.set_cookie(key="access_token",
                                   value=access_token,
                                   httponly=True,
                                   secure=True,
                                   samesite="None"
                                   )
            response.set_cookie(key="refresh_token",
                                value=str(refresh),
                                httponly=True,
                                secure=True,
                                samesite="None"
                                )
            
            return response
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
class LogoutView(APIView):
    def post(self, request):
        refresh_token = request.COOKIES.get("refresh_token")

        if refresh_token:
            try:
                refresh = RefreshToken(refresh_token)
                refresh.blacklist()
            except Exception as e:
                return Response({"error": "Error invalidating token: "+str(e)}, status=status.HTTP_400_BAD_REQUEST)
            
        response = Response({"message": "Successfully loged out."})
        response.delete_cookie("access_token")
        response.delete_cookie("refresh_token")

        return response
    
class CookieTokenRefreshView(TokenRefreshView):
    def post(self, request):

        refresh_token = request.COOKIES.get("refresh_token")

        if not refresh_token:
            return Response({"error": "Refresh token is not provided"}, status=status.HTTP_400_BAD_REQUEST)
        try: 
            refresh = RefreshToken(refresh_token)
            access_token = str(refresh.access_token)

            response = Response({"message": "Access token refreshed successfully."}, status=status.HTTP_200_OK)
            response.set_cookie(key="access_token",
                                value=access_token,
                                httponly=True,
                                secure=True,
                                samesite="None"
                                )
            return response
        except InvalidToken:
            return Response({"error": "Invalid token"}, status=status.HTTP_401_UNAUTHORIZED)
        
model = settings.XGB_MODEL
explainer = shap.TreeExplainer(model)
scaler = joblib.load(r"D:\Python projects\Django Projects\exoback\exoplanet\scaler_pro.pkl")


class PredictView(APIView):
    def post(self, request):
        serializer = PredictRequestSerializer(data=request.data)
        if serializer.is_valid():
            features = serializer.validated_data
            feature_names = list(features.keys())

            X = np.array([[features[name] for name in feature_names]])
            X_scaled = scaler.transform(X)  # нормализация

            proba = model.predict_proba(X_scaled)[0, 1]
            pred = int(proba >= 0.5)
            pred_label = "confirmed" if pred == 1 else "false"

            shap_values = explainer.shap_values(X_scaled)[0]
            shap_dict = dict(zip(feature_names, shap_values))

            obj, created = Exoplanets.objects.get_or_create(
                period=features["period"],
                duration=features["duration"],
                depth=features["depth"],
                prad=features["prad"],
                steff=features["steff"],
                srad=features["srad"],
                mag=features["mag"],
                defaults={
                    "disposition": f"{pred_label} ({proba:.2f})"
                }
            )

            if not created:
                obj.disposition = f"{pred_label} ({proba:.2f})"
                obj.save()

            if request.user.is_authenticated:
                obj.user = request.user
                obj.save()

            return Response({
                "prediction": pred,
                "probability": proba,
                "shap_values": shap_dict
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class BulkPredictView(APIView):
    parser_classes = [MultiPartParser]

    def post(self, request):
        file_obj = request.FILES.get("file")
        if not file_obj:
            return Response({"error": "Файл не найден"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            df = pd.read_csv(file_obj)
            required_cols = ["period", "duration", "depth", "prad", "steff", "srad", "mag"]

            if not all(col in df.columns for col in required_cols):
                return Response({"error": f"Файл должен содержать колонки: {required_cols}"}, status=400)

            features = df[required_cols].astype(float)
            features_scaled = scaler.transform(features)  # нормализация

            preds_proba = model.predict_proba(features_scaled)[:, 1]
            preds = (preds_proba >= 0.5).astype(int)

            dispositions = []
            for i, row in df.iterrows():
                label = "confirmed" if preds[i] == 1 else "false"
                proba = preds_proba[i]
                disposition = f"{label} ({proba:.3f})"
                dispositions.append(disposition)

                exoplanet = Exoplanets.objects.create(
                    period=row["period"],
                    duration=row["duration"],
                    depth=row["depth"],
                    prad=row["prad"],
                    steff=row["steff"],
                    srad=row["srad"],
                    mag=row["mag"],
                    disposition=disposition
                )

                if request.user.is_authenticated:
                    exoplanet.user = request.user
                    exoplanet.save()

            df["disposition"] = dispositions

            response = HttpResponse(content_type="text/csv")
            response["Content-Disposition"] = 'attachment; filename="predictions.csv"'
            df.to_csv(path_or_buf=response, index=False)

            return response

        except Exception as e:
            return Response({"error": str(e)}, status=500)

model_noob = settings.XGB_NOOB_MODEL
explainer_noob = shap.TreeExplainer(model)
scaler_noob = joblib.load(r"D:\Python projects\Django Projects\exoback\exoplanet\scaler_noob.pkl")

class PredictNoobView(APIView):
    def post(self, request):
        serializer = PredictNoobRequestSerializer(data=request.data)
        if serializer.is_valid():
            features = serializer.validated_data
            feature_names = list(features.keys())

            X = np.array([[features[name] for name in feature_names]])
            X_scaled = scaler_noob.transform(X)  # нормализация

            model = settings.XGB_NOOB_MODEL
            explainer = shap.TreeExplainer(model)

            proba = model.predict_proba(X_scaled)[0, 1]
            pred = int(proba >= 0.5)
            pred_label = "confirmed" if pred == 1 else "false"

            shap_values = explainer.shap_values(X_scaled)[0]
            shap_dict = dict(zip(feature_names, shap_values))

            obj, created = ExoplanetsNoob.objects.get_or_create(
                period=features["period"],
                duration=features["duration"],
                depth=features["depth"],
                kepmag=features["mag"],
                defaults={
                    "disposition": f"{pred_label} ({proba:.2f})"
                }
            )

            if not created:
                obj.disposition = f"{pred_label} ({proba:.2f})"
                obj.save()

            if request.user.is_authenticated:
                obj.user = request.user
                obj.save()

            return Response({
                "prediction": pred,
                "prediction_label": pred_label,
                "probability": round(float(proba), 3),
                "shap_values": shap_dict
            })

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class BulkPredictNoobView(APIView):
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, *args, **kwargs):
        file_obj = request.FILES.get("file")
        if not file_obj:
            return HttpResponse("No file uploaded", status=400)

        df = pd.read_csv(file_obj)
        required_cols = ["period", "duration", "depth", "mag"]
        if not all(col in df.columns for col in required_cols):
            return HttpResponse(f"CSV must contain columns: {required_cols}", status=400)

        model = settings.XGB_NOOB_MODEL
        explainer = shap.TreeExplainer(model)

        features = df[required_cols].astype(float)
        features_scaled = scaler_noob.transform(features)  # нормализация

        preds = model.predict(features_scaled)
        proba = model.predict_proba(features_scaled)[:, 1]
        shap_values = explainer.shap_values(features_scaled)

        dispositions = []
        for i, p in enumerate(preds):
            label = "confirmed" if p == 1 else "false"
            disposition = f"{label} ({proba[i]:.3f})"
            dispositions.append(disposition)

            exoplanet = ExoplanetsNoob.objects.create(
                period=df.iloc[i]["period"],
                duration=df.iloc[i]["duration"],
                depth=df.iloc[i]["depth"],
                kepmag=df.iloc[i]["mag"],
                disposition=disposition,
            )

            if request.user.is_authenticated:
                exoplanet.user = request.user
                exoplanet.save()

        df["disposition"] = dispositions

        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="predictions_noob.csv"'
        df.to_csv(path_or_buf=response, index=False)
        return response
    
class ExoplanetsListView(ListAPIView):
    queryset = Exoplanets.objects.all()
    serializer_class = ExoplanetsSerializer


class ExoplanetsNoobListView(ListAPIView):
    queryset = ExoplanetsNoob.objects.all()
    serializer_class = ExoplanetsNoobSerializer

class UserExoplanetsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        exoplanets = Exoplanets.objects.filter(user=request.user)
        exoplanets_noob = ExoplanetsNoob.objects.filter(user=request.user)

        data = {
            "exoplanets": [
                {
                    "id": obj.id,
                    "period": obj.period,
                    "duration": obj.duration,
                    "depth": obj.depth,
                    "prad": obj.prad,
                    "steff": obj.steff,
                    "srad": obj.srad,
                    "mag": obj.mag,
                    "disposition": obj.disposition,
                }
                for obj in exoplanets
            ],
            "exoplanets_noob": [
                {
                    "id": obj.id,
                    "period": obj.period,
                    "duration": obj.duration,
                    "depth": obj.depth,
                    "kepmag": obj.kepmag,
                    "disposition": obj.disposition,
                }
                for obj in exoplanets_noob
            ]
        }

        return Response(data, status=200)