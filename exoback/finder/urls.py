from django.urls import path
from .views import *

urlpatterns = [
    path('user-info/', UserInfoView.as_view(), name='user-info'),
    path('register/', UserRegistrationView.as_view(), name='registration'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('refresh/',  CookieTokenRefreshView.as_view(), name='refresh'),
    path("predict/", PredictView.as_view(), name="predict"),
    path("bulk_predict/", BulkPredictView.as_view(), name="bulk_predict"),

    path("predict_noob/", PredictNoobView.as_view(), name="predict_noob"),
    path("bulk_predict_noob/", BulkPredictNoobView.as_view(), name="bulk_predict_noob"),

    path("exoplanets/", ExoplanetsListView.as_view(), name="exoplanets_list"),
    path("exoplanets_noob/", ExoplanetsNoobListView.as_view(), name="exoplanets_noob_list"),
    path("give_my_exoplanets/", UserExoplanetsView.as_view(), name="my_exoplanets")
]