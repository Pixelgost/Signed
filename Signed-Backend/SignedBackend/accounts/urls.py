from django.contrib import admin
from django.urls import path
from .views import (
    AuthCreateNewUserView,
    AuthLoginExisitingUserView,
    AuthChangePasswordConfirmView,
    AuthChangePasswordInitView,
    AuthDeleteAccountConfirmView,
    AuthDeleteAccountInitView,
    MeView,
    AuthDeleteAccountView,
    AuthLogoutUserView,
)
from .job_postings import (
    create_job_posting,
    get_job_postings
)
from .verification_code import (
    send_verification_email,
    send_verification_text,
    verify_code
)

urlpatterns = [
    path('auth/sign-up/', AuthCreateNewUserView.as_view(), name='auth-create-user'),
    path('auth/sign-in/', AuthLoginExisitingUserView.as_view(), name='auth-login-user'),
    path('create-job-posting/', create_job_posting, name='create-job-posting'),
    path('get-job-postings/', get_job_postings, name='get-job-postings'),
    path('send-verification-email/', send_verification_email, name='send-verification-email'),
    path('send-verification-text/', send_verification_text, name='send-verification-text'),
    path('verify-code/', verify_code, name='verify-code'),
    path('auth/delete/init/', AuthDeleteAccountInitView.as_view(), name='auth-delete-init'),
    path('auth/delete/confirm/', AuthDeleteAccountConfirmView.as_view(), name='auth-delete-confirm'),
    path('auth/pw-change/init/', AuthChangePasswordInitView.as_view(), name='auth-pwchange-init'),
    path('auth/pw-change/confirm/', AuthChangePasswordConfirmView.as_view(), name='auth-pwchange-confirm'),
    path('auth/me/', MeView.as_view(), name='auth-me'),
    path('auth/delete/by-password/', AuthDeleteAccountView.as_view(), name="auth-delete-by-password"),
    path('auth/sign-out/', AuthLogoutUserView.as_view(), name='auth-logout-user'),
]
