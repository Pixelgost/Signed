"""
URL configuration for SignedBackend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path
from .views import ping, job_postings, verification_code

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/ping/', ping.ping, name='ping'),
    path('get-job-postings/', job_postings.get_job_postings, name='get-job-postings'),
    path('create-job-posting/', job_postings.create_job_posting, name='create-job-posting')
    path('verify/', verification_code.send_verification_email, name='send-verification-email')
]
