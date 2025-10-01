import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'settings')
django.setup()

import pytest
from rest_framework.test import APIRequestFactory, APIClient

@pytest.fixture
def api_factory():
    return APIRequestFactory()

@pytest.fixture
def api_client():
    return APIClient()
