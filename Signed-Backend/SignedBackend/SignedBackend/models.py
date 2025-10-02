from django.db import models
from django.utils import timezone
from datetime import timedelta
import uuid


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

# TODO: add the posted_by field once users are added
# Also potentially add statistics here such as number of impressions
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
    # posted_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name="job_postings")

    # meta data
    date_posted = models.DateTimeField(auto_now_add=True)
    date_updated = models.DateTimeField(auto_now_add=True)
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
                   job_description: {self.job_description}'''
    

class VerificationCode(models.Model):
    # user = 
    type = models.CharField()
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)


    def is_expired(self):
        return timezone.now() > self.created_at + timedelta(minutes=10)