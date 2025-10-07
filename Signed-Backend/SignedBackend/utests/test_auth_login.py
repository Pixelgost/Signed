import json
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory
from accounts.views import AuthLoginExisitingUserView

User = get_user_model()

# Fake Firebase Auth stub
class FakeAuth:
    def sign_in_with_email_and_password(self, email, password):
        if email == "wrong@example.com":
            raise Exception("INVALID_PASSWORD")
        return {
            "localId": f"uid_{email}",
            "idToken": f"idToken_{email}",
            "refreshToken": f"refreshToken_{email}",
            "expiresIn": "3600",
            "kind": "identitytoolkit#VerifyPasswordResponse",
        }
    
    def delete_user_account(self, id_token):
        return True



def _get_json(resp):
    if hasattr(resp, "data"):
        return resp.data
    return json.loads(resp.content.decode())


# Unit Tests
@pytest.mark.django_db
def test_login_success(monkeypatch):
    from accounts import views
    fake_auth = FakeAuth()
    monkeypatch.setattr(views, "auth", fake_auth)

    # Create a test user in database
    user = User.objects.create(
        email="user@example.com",
        first_name="Kylie",
        last_name="Smith",
        role="applicant",
    )
    user.set_password("Abcd1234!")
    user.save()

    factory = APIRequestFactory()
    view = AuthLoginExisitingUserView.as_view()

    data = {
        "email": "user@example.com",
        "password": "Abcd1234!",
    }

    request = factory.post("/", data, format="json")
    response = view(request)

    assert response.status_code == 200
    body = _get_json(response)
    assert body["status"] == "success"
    assert "firebase_access_token" in body["data"]


@pytest.mark.django_db
def test_login_invalid_credentials(monkeypatch):
    from accounts import views
    fake_auth = FakeAuth()
    monkeypatch.setattr(views, "auth", fake_auth)

    factory = APIRequestFactory()
    view = AuthLoginExisitingUserView.as_view()

    data = {"email": "wrong@example.com", "password": "badpassword"}
    request = factory.post("/", data, format="json")
    response = view(request)
    body = _get_json(response)

    assert response.status_code == 400
    assert "Invalid email or password" in body.get("message", "")


@pytest.mark.django_db
def test_login_missing_fields():
    factory = APIRequestFactory()
    view = AuthLoginExisitingUserView.as_view()

    data = {"email": ""}  # missing password
    request = factory.post("/", data, format="json")
    response = view(request)
    body = _get_json(response)

    assert response.status_code == 400
    assert "Invalid email or password" in body.get("message", "")


@pytest.mark.django_db
def test_login_user_not_found(monkeypatch):
    from accounts import views
    fake_auth = FakeAuth()
    monkeypatch.setattr(views, "auth", fake_auth)

    factory = APIRequestFactory()
    view = AuthLoginExisitingUserView.as_view()

    data = {"email": "nonexistent@example.com", "password": "Abcd1234!"}
    request = factory.post("/", data, format="json")
    response = view(request)
    body = _get_json(response)

    assert response.status_code == 404
    assert "User does not exist" in body.get("message", "")
