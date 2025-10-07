from django.contrib import admin
from django.urls import path
from .views import (
    AuthCreateNewUserView, 
    AuthLoginExisitingUserView,
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
    path('verify-code/', verify_code, name='verify-code')
]
