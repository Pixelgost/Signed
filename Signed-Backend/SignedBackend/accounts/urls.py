from django.contrib import admin
from django.urls import path
from .views import (
    AuthCreateNewUserView,
    AuthLoginExisitingUserView,
    AuthChangePasswordConfirmView,
    AuthChangePasswordInitView,
    AuthDeleteAccountConfirmView,
    AuthDeleteAccountInitView,
    AuthDeleteAccountFromDjangoView,
    MeView,
    AuthDeleteAccountView,
    AuthLogoutUserView,
    UploadProfileImageView,
    GetCompanyView,
    ProfileUpdateView
)
from .job_postings import (
    create_job_posting,
    get_job_postings,
    apply_to_job,
    reject_job,
    like_job_posting
)
from .verification_code import (
    send_verification_email,
    send_verification_text,
    verify_code
)
from .users import (
    check_email,
    change_password
)

urlpatterns = [
    path('auth/sign-up/', AuthCreateNewUserView.as_view(), name='auth-create-user'),
    path('auth/sign-in/', AuthLoginExisitingUserView.as_view(), name='auth-login-user'),
    path('create-job-posting/', create_job_posting, name='create-job-posting'),
    path('get-job-postings/', get_job_postings, name='get-job-postings'),
    path('apply-to-job/', apply_to_job, name='apply-to-job'),
    path('reject-job/', reject_job, name='reject-job'),
    path('send-verification-email/', send_verification_email, name='send-verification-email'),
    path('send-verification-text/', send_verification_text, name='send-verification-text'),
    path('verify-code/', verify_code, name='verify-code'),
    path('auth/delete/init/', AuthDeleteAccountInitView.as_view(), name='auth-delete-init'),
    path('auth/delete/confirm/', AuthDeleteAccountConfirmView.as_view(), name='auth-delete-confirm'),
    path('auth/delete/direct/', AuthDeleteAccountFromDjangoView.as_view(), name='auth-delete-direct'),
    path('auth/pw-change/init/', AuthChangePasswordInitView.as_view(), name='auth-pwchange-init'),
    path('auth/pw-change/confirm/', AuthChangePasswordConfirmView.as_view(), name='auth-pwchange-confirm'),
    path('auth/me/', MeView.as_view(), name='auth-me'),
    path('auth/delete/by-password/', AuthDeleteAccountView.as_view(), name="auth-delete-by-password"),
    path('auth/sign-out/', AuthLogoutUserView.as_view(), name='auth-logout-user'),
    path('auth/me/upload-photo/', UploadProfileImageView.as_view(), name='upload-profile-photo'),
    path('check-email-exists/', check_email, name='email-exists'),
    path('change-password/', change_password, name='change-password'),
    path("auth/get-company/", GetCompanyView.as_view(), name="get_company_current_user"),
    path('update-profile/', ProfileUpdateView.as_view(), name='update-profile'),
    path('like-job-posting/', like_job_posting, name='like-job-posting'),
]
