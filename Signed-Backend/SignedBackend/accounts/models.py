from django.db import models
from django.contrib.auth.models import AbstractUser
from django.contrib.auth.base_user import BaseUserManager
from django.utils.translation import gettext_lazy as _
import uuid


class CustomUserManager(BaseUserManager):
    def create_user(self, email, password):
      if not email:
        raise ValueError(_('The Email must be set'))
      email = self.normalize_email(email)
      user = self.model(
      email=email,
      )
      user.set_password(password)
      user.save()
      return user
    
    def create_superuser(self, email, password):
      return self.create_user(email, password)
    
# general user table
class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(_('email address'), unique=True)
    username = None
    # ROLE_CHOICES = (
    #     ('applicant', 'Applicant'),
    #     ('employer', 'Employer'),
    # )
    role = models.CharField(
      max_length=20,
      choices=[("employer", "Employer"), ("applicant", "Applicant")],
      default="applicant"  # <-- set a default
    )
    firebase_uid = models.CharField(max_length=255, blank=True, null=True)
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []
    objects = CustomUserManager()
    
    def __str__(self):
        return self.email
    class Meta:
        db_table = 'user'
        verbose_name = _('user')
        verbose_name_plural = _('users')
        ordering = ['-date_joined']

# extends user table - specifically for employer
class EmployerProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="employer_profile")
    company_name = models.CharField(max_length=255)
    job_title = models.CharField(max_length=255)
    company_size = models.CharField(max_length=50)
    company_website = models.URLField(blank=True, null=True)


class ApplicantProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="applicant_profile")
    major = models.CharField(max_length=255)
    school = models.CharField(max_length=255)
    resume = models.TextField(blank=True, null=True)  # for link/base64 string
    resume_file = models.FileField(upload_to="resumes/", blank=True, null=True)
    skills = models.TextField(blank=True, null=True)
    portfolio_url = models.URLField(blank=True, null=True)

