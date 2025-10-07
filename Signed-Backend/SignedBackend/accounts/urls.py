from django.contrib import admin
from django.urls import path
from .views import (
    AuthCreateNewUserView, 
    AuthLoginExisitingUserView,
    AuthLogoutUserView,
)

urlpatterns = [
    path('auth/sign-up/', AuthCreateNewUserView.as_view(), name='auth-create-user'),
    path('auth/sign-in/', AuthLoginExisitingUserView.as_view(), name='auth-login-user'),
    path('auth/sign-out/', AuthLogoutUserView.as_view(), name='auth-logout-user'),
]
