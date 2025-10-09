from rest_framework import serializers
from .models import User, EmployerProfile, ApplicantProfile


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "role", "firebase_uid"]

class EmployerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmployerProfile
        fields = ["company_name", "job_title", "company_size", "company_website"]
        
class ApplicantProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApplicantProfile
        fields = ["major", "school", "resume", "resume_file", "skills", "portfolio_url"]
        
class MeSerializer(serializers.ModelSerializer):
    employer_profile = EmployerProfileSerializer(read_only=True)
    applicant_profile = ApplicantProfileSerializer(read_only=True)
    
    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "role", "firebase_uid", "employer_profile", "applicant_profile",]


class EmployerSignupSerializer(serializers.ModelSerializer):
    # employer fields
    company_name = serializers.CharField(required=True)
    job_title = serializers.CharField(required=True)
    company_size = serializers.CharField(required=True)
    company_website = serializers.URLField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ["email", "password", "first_name", "last_name", "role",
                  "company_name", "job_title", "company_size", "company_website"]

        extra_kwargs = {"password": {"write_only": True}}

    def create(self, validated_data):
        # pop profile fields
        company_name = validated_data.pop("company_name")
        job_title = validated_data.pop("job_title")
        company_size = validated_data.pop("company_size")
        company_website = validated_data.pop("company_website", "")

        # create user
        user = User.objects.create(**validated_data)
        user.set_password(validated_data["password"])
        user.save()

        # create employer profile
        EmployerProfile.objects.create(
            user=user,
            company_name=company_name,
            job_title=job_title,
            company_size=company_size,
            company_website=company_website,
        )
        return user


class ApplicantSignupSerializer(serializers.ModelSerializer):
    # applicant fields
    major = serializers.CharField(required=True)
    school = serializers.CharField(required=True)
    resume = serializers.CharField(required=False, allow_blank=True)
    resume_file = serializers.FileField(required=False, allow_null=True)
    skills = serializers.CharField(required=False, allow_blank=True)
    portfolio_url = serializers.URLField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ["email", "password", "first_name", "last_name", "role",
                  "major", "school", "resume", "resume_file", "skills", "portfolio_url"]

        extra_kwargs = {"password": {"write_only": True}}

    def create(self, validated_data):
        # pop profile fields
        major = validated_data.pop("major")
        school = validated_data.pop("school")
        resume = validated_data.pop("resume", "")
        resume_file = validated_data.pop("resume_file", None)
        skills = validated_data.pop("skills", "")
        portfolio_url = validated_data.pop("portfolio_url", "")

        # create user
        user = User.objects.create(**validated_data)
        user.set_password(validated_data["password"])
        user.save()

        # create applicant profile
        ApplicantProfile.objects.create(
            user=user,
            major=major,
            school=school,
            resume=resume,
            resume_file=resume_file,
            skills=skills,
            portfolio_url=portfolio_url,
        )
        return user
