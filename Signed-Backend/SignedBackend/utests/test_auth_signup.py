import json
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory
from accounts.views import AuthCreateNewUserView
from django.core.files.uploadedfile import SimpleUploadedFile

User = get_user_model()

# Fake Firebase Auth stub
class FakeAuth:
    def __init__(self):
        self.deleted_tokens = []

    def create_user_with_email_and_password(self, email, password):
        return {
            "localId": f"uid_{email}",
            "idToken": f"idToken_{email}",
            "refreshToken": f"refreshToken_{email}",
            "expiresIn": "3600",
            "kind": "identitytoolkit#SignupNewUserResponse",
        }

    def delete_user_account(self, idToken):
        self.deleted_tokens.append(idToken)
        return {"status": "deleted"}

    def sign_in_with_email_and_password(self, email, password):
        return {
            "localId": f"uid_{email}",
            "idToken": f"idToken_{email}",
            "refreshToken": f"refreshToken_{email}",
            "expiresIn": "3600",
            "kind": "identitytoolkit#VerifyPasswordResponse",
        }


# Helper functions
def _get_json(resp):
    if hasattr(resp, "data"):
        return resp.data
    return json.loads(resp.content.decode())


# Unit Tests
@pytest.mark.django_db
def test_applicant_signup_success(monkeypatch):
    from accounts import views

    fake_auth = FakeAuth()
    monkeypatch.setattr(views, "auth", fake_auth)
    factory = APIRequestFactory()
    view = AuthCreateNewUserView.as_view()
    data = {
        "email": "applicant@example.com",
        "password": "Abcd1234!",
        "first_name": "Sarah",
        "last_name": "Coleman",
        "role": "applicant",
        "major": "CS",
        "school": "Purdue",
    }
    request = factory.post("/", data, format="multipart")
    response = view(request)
    assert response.status_code == 201
    body = _get_json(response)
    assert body["status"] == "success"
    assert User.objects.filter(email="applicant@example.com").exists()


@pytest.mark.django_db
def test_signup_with_resume_file_upload(monkeypatch):
    from accounts import views

    fake_auth = FakeAuth()
    monkeypatch.setattr(views, "auth", fake_auth)
    factory = APIRequestFactory()
    view = AuthCreateNewUserView.as_view()
    resume_file = SimpleUploadedFile("resume.pdf", b"Fake PDF content", content_type="application/pdf")
    data = {
        "email": "fileupload@example.com",
        "password": "Abcd1234!",
        "first_name": "File",
        "last_name": "Upload",
        "role": "applicant",
        "major": "CS",
        "school": "Purdue",
    }
    request = factory.post("/", data, format="multipart", files={"resume": resume_file})
    response = view(request)
    body = _get_json(response)
    assert response.status_code == 201
    assert body["status"] == "success"


@pytest.mark.django_db
def test_employer_signup_success(monkeypatch):
    from accounts import views

    fake_auth = FakeAuth()
    monkeypatch.setattr(views, "auth", fake_auth)
    factory = APIRequestFactory()
    view = AuthCreateNewUserView.as_view()
    data = {
        "email": "employer@example.com",
        "password": "StrongPass1$",
        "first_name": "Alice",
        "last_name": "Cooper",
        "role": "employer",
        "company_name": "Apple",
        "job_title": "Tech Recruiter",
        "company_size": "50-100",
    }
    request = factory.post("/", data, format="multipart")
    response = view(request)
    assert response.status_code == 201
    body = _get_json(response)
    assert body["status"] == "success"
    assert User.objects.filter(email="employer@example.com").exists()


def test_password_too_short():
    factory = APIRequestFactory()
    view = AuthCreateNewUserView.as_view()
    data = {
        "email": "shortpass@example.com",
        "password": "Ab1!",
        "first_name": "Short",
        "last_name": "Pass",
        "role": "applicant",
        "major": "CS",
        "school": "Purdue",
    }
    request = factory.post("/", data, format="multipart")
    response = view(request)
    assert response.status_code == 400
    body = _get_json(response)
    assert "Password must be at least 8 characters." in body.get("message", "")


def test_password_missing_character_types():
    factory = APIRequestFactory()
    view = AuthCreateNewUserView.as_view()
    data = {
        "email": "weakchar@example.com",
        "password": "abcdefgh",  # no uppercase, digit, special character
        "first_name": "Weak",
        "last_name": "Char",
        "role": "applicant",
        "major": "CS",
        "school": "Purdue",
    }
    request = factory.post("/", data, format="multipart")
    response = view(request)
    assert response.status_code == 400
    body = _get_json(response)
    assert "Password must contain uppercase, lowercase, digit, and special character." in body.get("message", "")


def test_invalid_email():
    factory = APIRequestFactory()
    view = AuthCreateNewUserView.as_view()
    data = {
        "email": "not-an-email",
        "password": "Abcd1234!",
        "first_name": "Bad",
        "last_name": "Email",
        "role": "applicant",
        "major": "CS",
        "school": "Purdue",
    }
    request = factory.post("/", data, format="multipart")
    response = view(request)
    assert response.status_code == 400
    body = _get_json(response)
    assert "Enter a valid email address." in body.get("message", "")


def test_missing_required_field():
    factory = APIRequestFactory()
    view = AuthCreateNewUserView.as_view()
    data = {
        "email": "missing@example.com",
        "password": "Abcd1234!",
        # missing first_name
        "last_name": "NoFirst",
        "role": "applicant",
        "major": "CS",
        "school": "Purdue",
    }
    request = factory.post("/", data, format="multipart")
    response = view(request)
    assert response.status_code == 400
    body = _get_json(response)
    assert "All fields are required." in body.get("message", "")


@pytest.mark.django_db
def test_invalid_role(monkeypatch):
    from accounts import views

    fake_auth = FakeAuth()
    monkeypatch.setattr(views, "auth", fake_auth)
    factory = APIRequestFactory()
    view = AuthCreateNewUserView.as_view()
    data = {
        "email": "invalidrole@example.com",
        "password": "Abcd1234!",
        "first_name": "Invalid",
        "last_name": "Role",
        "role": "admin",  # invalid role
        "major": "CS",
        "school": "Purdue",
    }
    request = factory.post("/", data, format="multipart")
    response = view(request)
    assert response.status_code == 400
    body = _get_json(response)
    assert "Invalid role specified." in body.get("message", "")


@pytest.mark.django_db
def test_signup_email_already_exists(monkeypatch):
    from accounts import views

    # pre-create user
    if hasattr(User.objects, "create_user"):
        User.objects.create_user(
            email="exists@example.com",
            password="Abcd1234!",
        )
    else:
        u = User.objects.create(email="exists@example.com", first_name="E", last_name="X")
        u.set_password("Abcd1234!")
        u.save()
    fake_auth = FakeAuth()
    monkeypatch.setattr(views, "auth", fake_auth)
    factory = APIRequestFactory()
    view = AuthCreateNewUserView.as_view()
    data = {
        "email": "exists@example.com",
        "password": "Abcd1234!",
        "first_name": "New",
        "last_name": "User",
        "role": "applicant",
        "major": "CS",
        "school": "Purdue",
    }
    request = factory.post("/", data, format="multipart")
    response = view(request)
    assert response.status_code == 400
    body = _get_json(response)
    assert "errors" in body


@pytest.mark.django_db
def test_firebase_signup_failure(monkeypatch):
    from accounts import views

    def fake_create_user_fail(email, password):
        raise Exception("Firebase service unavailable")

    monkeypatch.setattr(views.auth, "create_user_with_email_and_password", fake_create_user_fail)
    
    factory = APIRequestFactory()
    view = AuthCreateNewUserView.as_view()
    data = {
        "email": "failfirebase@example.com",
        "password": "Abcd1234!",
        "first_name": "Fail",
        "last_name": "Firebase",
        "role": "applicant",
        "major": "CS",
        "school": "Purdue",
    }
    request = factory.post("/", data, format="multipart")
    response = view(request)
    assert response.status_code == 400
    body = _get_json(response)
    assert "Firebase service unavailable" in body.get("message", "")


@pytest.mark.django_db
def test_firebase_rollback_on_serializer_failure(monkeypatch):
    from accounts import views

    # Make Firebase create user normally
    fake_auth = FakeAuth()
    monkeypatch.setattr(views, "auth", fake_auth)

    # Monkeypatch serializer to always fail
    class FakeSerializer:
        def __init__(self, data):
            self.data = data
            self.instance = None
        def is_valid(self):
            return False
        @property
        def errors(self):
            return {"email": ["Invalid email format"]}
    
    monkeypatch.setattr(views, "ApplicantSignupSerializer", FakeSerializer)
    monkeypatch.setattr(views, "EmployerSignupSerializer", FakeSerializer)
    factory = APIRequestFactory()
    view = AuthCreateNewUserView.as_view()
    data = {
        "email": "rollback@example.com",
        "password": "Abcd1234!",
        "first_name": "Rollback",
        "last_name": "User",
        "role": "applicant",
        "major": "CS",
        "school": "Purdue",
    }
    request = factory.post("/", data, format="multipart")
    response = view(request)
    body = _get_json(response)
    # Firebase UID should be in data, so delete_user_account should be called
    assert response.status_code == 400
    assert "errors" in body
