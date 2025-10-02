import random
from django.core.mail import send_mail
from django.conf import settings
from django.http import JsonResponse
from email.utils import formataddr


# from ..models import VerificationCode

# random 6 digit code
def generate_code():
    return ''.join(random.choice("0123456789") for _ in range(6))


def send_verification_email(request):
    code = generate_code()
    # verification = VerificationCode.objects.create(user=user, code=code)

    subject = "Your verification code"
    message = f"Your verification code is: {code}. It expires in 10 minutes."
    print("FROM EMAIL:", settings.DEFAULT_FROM_EMAIL)
    from_email = formataddr(("Signed Verification", settings.DEFAULT_FROM_EMAIL))   
    recipient_list = ["victorgao0308@gmail.com"]
    send_mail(subject, message, from_email, recipient_list)

    return JsonResponse({"message": "success"})
