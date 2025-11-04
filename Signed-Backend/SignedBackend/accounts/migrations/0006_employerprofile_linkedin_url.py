# Generated migration for adding linkedin_url field to EmployerProfile

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0005_jobposting_vector_embedding'),
    ]

    operations = [
        migrations.AddField(
            model_name='employerprofile',
            name='linkedin_url',
            field=models.URLField(blank=True, null=True),
        ),
    ]
