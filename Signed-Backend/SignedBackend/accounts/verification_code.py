import random
from django.core.mail import send_mail
from django.conf import settings
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from email.utils import formataddr
from decouple import config as env_config
import requests
from .models import VerificationCode, VerificationMode
from .firebase_admin import db
from datetime import datetime, timezone, timedelta


# random 6 digit code
def generate_code():
    return ''.join(random.choice("0123456789") for _ in range(6))

@api_view(['POST'])
@permission_classes([AllowAny])
def send_verification_email(request):

    email = request.data.get("email")

    if not email:
        return Response({"Error": "Please provide an email to send a code to"}, status=400)

    # override code if one aleady exists
    verification_code = VerificationCode.objects.filter(user=email).first()
    if verification_code:   
        db.collection("verification_codes").document(str(verification_code.id)).delete()
        verification_code.delete()

    code = generate_code()
    verification = VerificationCode.objects.create(type = VerificationMode.EMAIL, code=code, user = email)
    verification.save()

    subject = "Your verification code"
    message = f"Your verification code is: {code}. It expires in 10 minutes."
    from_email = formataddr(("Signed Verification", settings.DEFAULT_FROM_EMAIL))   
    recipient_list = [email]
    send_mail(subject, message, from_email, recipient_list)

    db.collection("verification_codes").document(str(verification.id)).set(verification_code_to_dict(verification))

    return Response({"Success": "success"}, status=200)


'''
PLEASE NOTE: DO NOT ABUSE THE FUNCTIONALITY TO SEND SMS.
For general verification purposes, please use email.

Add your phone number to the ALLOWED_PHONE_NUMBERS field in .env
Make sure it is correct, we want to avoid sending SMS to random numbers!!!

Also, please limit how many messages you are sending

When testing, append "_test" to the end of the API key; this makes it so API credits aren't consumed.
Text messages will not be sent, however, if the status is 200, removing "_test" will send the SMS.
'''
@api_view(['POST'])
def send_verification_text(request):

    phone_number = request.data.get("phone_number")
    valid_numbers = env_config("ALLOWED_PHONE_NUMBERS").split(",")

    if phone_number not in valid_numbers:
        return Response({"Error": "Phone number not in allowed list of recipients"}, status=400) 

    # override code if one aleady exists
    verification_code = VerificationCode.objects.filter(user=phone_number).first()
    if verification_code:
        db.collection("verification_codes").document(str(verification_code.id)).delete()
        verification_code.delete()

    code = generate_code()

    api_key = env_config("TEXTBELT_API_KEY")

    # Append _test to API key
    api_key += "_test"

    message = f"Your verification code is: {code}. It expires in 10 minutes."

    response = requests.post('https://textbelt.com/text', {
        'phone': phone_number,
        'message': message,
        'key': api_key,
    })

    if response.json()["success"]:
        verification = VerificationCode.objects.create(type = VerificationMode.PHONE, code=code, user = phone_number)
        verification.save()
        db.collection("verification_codes").document(str(verification.id)).set(verification_code_to_dict(verification))
        return Response({"Success": "success"}, status=200)

    else:
        return Response({"Error": response.json()["error"]}, status=500)
    

@api_view(['POST'])
def verify_code(request):
    data = request.data
    user = data.get("user")
    code = data.get("code")

    query_ref = db.collection("verification_codes").where("user", "==", user)

    if not query_ref.get():
        return Response({"Error": "Associated email/phone does not have an active verification code"}, status=400)
    
    result = query_ref.get()[0]

    result = result.to_dict()

    if code != result["code"]:
        return Response({"Error": "Code did not match"}, status=400)
    
    now = datetime.now(timezone.utc)

    if result["created_at"] + timedelta(minutes=10) < now:
        return Response({"Error": "Code Expired"}, status=400)

    return Response({"Success": "success"}, status=200)


def verification_code_to_dict(verification_code):
    return {
        "id": str(verification_code.id),
        "type": verification_code.type,
        "user": verification_code.user,
        "code": verification_code.code,
        "created_at":verification_code.created_at
    }
