import requests
from django.conf import settings

VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify"

def verify_recaptcha(token: str, remote_ip: str | None = None) -> tuple[bool, dict]:
    """
    Returns (ok, payload). For v2 we only check 'success' flag.
    """
    if not token:
        return False, {"error": "missing token"}
    data = {"secret": settings.RECAPTCHA_SECRET, "response": token}
    if remote_ip:
        data["remoteip"] = remote_ip
    try:
        r = requests.post(VERIFY_URL, data=data, timeout=5)
        payload = r.json()
        return bool(payload.get("success", False)), payload
    except Exception as e:
        return False, {"error": str(e)}