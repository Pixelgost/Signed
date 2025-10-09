from datetime import timedelta, timezone
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

class MediaItem(models.Model):
    file_type = models.CharField(max_length=255)
    file_size = models.IntegerField()
    file_name = models.TextField()
    download_link = models.TextField()

    def __str__(self):
        return f'''fileType: {self.file_type}
                   fileSize: {self.file_size}
                   fileName: {self.file_name}
                   downloadLink: {self.download_link}'''

# TODO add statistics here such as number of impressions
class JobPosting(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    media_items = models.ManyToManyField(MediaItem, blank=True, related_name="job_postings")
    company_logo = models.ForeignKey(MediaItem, on_delete=models.CASCADE, related_name="job_postings_logo", null=True)

    job_title = models.CharField(max_length=255)
    company = models.CharField(max_length=255)
    location = models.CharField(max_length=255)
    job_type = models.CharField(max_length=255)
    salary = models.CharField(max_length=255, null=True)
    company_size = models.CharField(max_length=255, null=True)
    tags = models.JSONField(default=list, blank=True)
    job_description = models.TextField(null=True)
    posted_by = models.ForeignKey(EmployerProfile, on_delete=models.CASCADE, related_name="job_postings", null=True)

    # meta data
    date_posted = models.DateTimeField(auto_now_add=True)
    date_updated = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        media_str = "\n".join(str(item) for item in self.media_items.all())
        return f'''media_items: {media_str}
                   company_logo: {str(self.company_logo)}
                   job_title: {self.job_title}
                   company: {self.company}
                   location: {self.location}
                   job_type: {self.job_type}
                   salary: {self.salary}
                   company_size: {self.company_size}
                   tags: {self.tags}
                   job_description: {self.job_description}
                   posted_by: {self.posted_by}'''


class VerificationMode(models.TextChoices):
    EMAIL = "EMAIL", "Email"
    PHONE = "PHONE", "Phone"

'''
VerificationCode model to hold verification codes requested by users.
This associates user emails/phone numbers with a 6 digit code for easy lookup to see
if the code a user entered is correct or not

type: either EMAIL or PHONE
code: 6 digit verification phone
user: email or phone of the user, depending on the verification type
created_at: timestamp of when verification was created
'''
class VerificationCode(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    type = models.CharField(max_length=5, choices=VerificationMode.choices, default=VerificationMode.EMAIL)
    code = models.CharField(max_length=6)
    user = models.CharField(max_length=255, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    def is_expired(self):
        return timezone.now() > self.created_at + timedelta(minutes=10)
    
    def __str__(self):
        return f'''type: {self.type}
                   code: {self.code}
                   user: {self.user}
                   created_at: {self.created_at}'''

