# Generated migration for adding JobLike model and likes_count field to JobPosting

from django.db import migrations, models
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0006_employerprofile_linkedin_url'),
    ]

    operations = [
        migrations.AddField(
            model_name='jobposting',
            name='likes_count',
            field=models.IntegerField(default=0),
        ),
        migrations.CreateModel(
            name='JobLike',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('job_posting', models.ForeignKey(on_delete=models.CASCADE, related_name='likes', to='accounts.jobposting')),
                ('user', models.ForeignKey(on_delete=models.CASCADE, related_name='job_likes', to='accounts.user')),
            ],
            options={
                'unique_together': {('user', 'job_posting')},
            },
        ),
    ]

