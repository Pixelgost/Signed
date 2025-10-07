from django.contrib import admin
from django.urls import path
from .views import (
    AuthCreateNewUserView, 
    AuthLoginExisitingUserView,
    AuthLogoutView,
)

urlpatterns = [
    path('auth/sign-up/', AuthCreateNewUserView.as_view(), name='auth-create-user'),
    path('auth/sign-in/', AuthLoginExisitingUserView.as_view(), name='auth-login-user'),
    path('auth/logout/', AuthLogoutView.as_view(), name='auth-logout'),
]
