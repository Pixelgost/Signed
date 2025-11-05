from contextlib import nullcontext
from datetime import timedelta, timezone
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.contrib.auth.base_user import BaseUserManager
from django.utils.translation import gettext_lazy as _
import uuid
from django.db.models.signals import post_save
from django.dispatch import receiver


class CustomUserManager(BaseUserManager):
    def create_user(self, email, password):
        if not email:
            raise ValueError(_('The Email must be set'))
        email = self.normalize_email(email)
        user = self.model(email=email)
        user.set_password(password)
        user.save()
        return user
    
    def create_superuser(self, email, password):
        return self.create_user(email, password)

class User(AbstractUser):
    ROLE_CHOICES = (
        ("applicant", "Applicant"),
        ("employer", "Employer"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    firebase_uid = models.CharField(max_length=128, blank=True, null=True)

    username = None  # Remove username field (we'll use email)
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name", "last_name", "role"]

    def __str__(self):
        return self.email
    
class Company(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, unique=True)
    size = models.CharField(max_length=50, blank=True, null=True)
    website = models.URLField(blank=True, null=True)
    logo = models.ImageField(upload_to="company_logos/", blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class EmployerProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="employer_profile")
    # company_name = models.CharField(max_length=255)
    # add null=True, blank=True for testing
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="employers")
    job_title = models.CharField(max_length=255)
    # company_size = models.CharField(max_length=50)
    # company_website = models.URLField(blank=True, null=True)
    location = models.CharField(max_length=255, blank=True)
    bio = models.TextField(blank=True)
    linkedin_url = models.URLField(blank=True, null=True)
    profile_image = models.ImageField(upload_to="employer_profiles/", blank=True, null=True)
    notifications_enabled = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.user.email} - {self.company.name}"


class ApplicantProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="applicant_profile")
    major = models.CharField(max_length=255)
    school = models.CharField(max_length=255)
    resume = models.TextField(blank=True, null=True)
    resume_file = models.FileField(upload_to="applicant_resumes/", blank=True, null=True)
    skills = models.TextField(blank=True, null=True)  # comma-separated or JSON
    portfolio_url = models.URLField(blank=True, null=True)
    profile_image = models.ImageField(upload_to="applicant_profiles/", blank=True, null=True)
    bio = models.TextField(blank=True, null=True)
    vector_embedding = models.JSONField(null=True, blank=True)
    personality_type = models.CharField(max_length=255, blank=True, null=True)
    notifications_enabled = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.user.email} - {self.school}"


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

class PersonalityType(models.Model):
    types = models.CharField(max_length=15, unique=True)

    def __str__(self):
        return self.types

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
    vector_embedding = models.JSONField(null=True, blank=True)
    personality_preferences = models.ManyToManyField(PersonalityType, blank=True)

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

