from django.shortcuts import render
from django.core.mail import send_mail
from django.conf import settings
from django.db import transaction
import random
from .models import VerificationCode
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from .models import User, ApplicantProfile, EmployerProfile, Company, Notification, JobPosting
from .serializers import UserSerializer, EmployerSignupSerializer, ApplicantSignupSerializer, MeSerializer, ApplicantProfileSerializer, EmployerProfileSerializer, NotificationSerializer, CreateNotificationSerializer
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
from rest_framework.permissions import AllowAny, IsAuthenticated
from .firebase_auth.firebase_authentication import auth as firebase_admin_auth
from django.contrib.auth.hashers import check_password
from django.contrib.auth import get_user_model, logout
import re
from settings import auth
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from accounts.firebase_auth.firebase_authentication import FirebaseAuthentication
from rest_framework.authentication import SessionAuthentication, BasicAuthentication


def _get_id_token(request: Request) -> str | None:
  # tries to read firebase ID token from auth
  auth_header = request.META.get("HTTP_AUTHORIZATION", "")
  if auth_header.startswith("Bearer "):
    return auth_header.split(" ", 1)[1].strip()
  return request.data.get("idToken") or request.data.get("firebase_id_token")

def _verify_and_get_user(request: Request) -> tuple[User | None, dict | None, Response | None]:
  # verify firebase id with admin sdk --> returns (user, token, error)
  id_token = _get_id_token(request)
  if not id_token:
    return None, None, Response(
      {"status": "failed", "message": "Missing Firebase ID Token"},
      status=status.HTTP_401_UNAUTHORIZED,
    )
  
  try:
    decoded = firebase_admin_auth.verify_id_token(id_token)
  except Exception as e:
      print("Firebase verification failed:", e)
      return None, None, Response(
          {"status": "failed", "message": f"Firebase verification failed: {str(e)}"},
          status=status.HTTP_401_UNAUTHORIZED,
      )
  
  uid = decoded.get("uid")
  if not uid:
    return None, None, Response(
      {"status": "failed", "message": "Missing Firebase ID Token"},
      status=status.HTTP_401_UNAUTHORIZED,
    )
    
  try:
    dj_user = User.objects.get(firebase_uid=uid)
  except User.DoesNotExist:
    return None, None, Response(
      {"status": "failed", "message": "No such Django user with this token"},
      status=status.HTTP_401_UNAUTHORIZED,
    )
  
  return dj_user, {"decoded": decoded, "id_token": id_token}, None

class AuthChangePasswordInitView(APIView):
  #post body should have: { email, current_password (optional) }-->should send firebase reset email
  permission_classes = [AllowAny]
  authentication_classes = []
  @swagger_auto_schema(
    operation_summary="Change password with firebase email send",
    tags=["User Management"],
    request_body=openapi.Schema(
      type=openapi.TYPE_OBJECT,
      properties={
        "email": openapi.Schema(type=openapi.TYPE_STRING),
        "current_password": openapi.Schema(type=openapi.TYPE_STRING),
        #"new_password": openapi.Schema(type=openapi.TYPE_STRING),
        #"idToken": openapi.Schema(type=openapi.TYPE_STRING),
      },
      required=["email"],
    ),
    responses={200: "Password Email Sent", 400: "Bad request"},
  )
  def post(self, request: Request):
    email = request.data.get("email")
    current_pw = request.data.get("current_password")
    
    if not email:
      return Response(
        {"status": "failed", "message": "email required"},
        status=status.HTTP_400_BAD_REQUEST,
      )
    
    try:
      dj_user = User.objects.get(email=email)
      if current_pw and not check_password(current_pw, dj_user.password):
        return Response(
          {"status": "failed", "message": "password incorrect"},
          status=status.HTTP_400_BAD_REQUEST,
        )
    except User.DoesNotExist:
      return Response(
        {"status": "failed", "message": "user not found"},
        status=status.HTTP_404_NOT_FOUND,
      )
    
    try:
      #firebase sends email here
      auth.send_password_reset_email(email)
      return Response(
        {"status": "success", "message": "pw reset email sent"},
        status=status.HTTP_200_OK,
      )
    except Exception as e:
      return Response(
        {"status": "failed", "message": str(e)},
        status=status.HTTP_400_BAD_REQUEST,
      )

#user clicked on change pw 2fa email link
class AuthChangePasswordConfirmView(APIView):
  #body: {email, oob_code, new_password} --> takes firebase oob code and updates django
  permission_classes = [AllowAny]
  authentication_classes = []
  
  @swagger_auto_schema(
    operation_summary="CONFIRM Change password with 2fa",
    tags=["User Management"],
    request_body=openapi.Schema(
      type=openapi.TYPE_OBJECT,
      properties={
        "email": openapi.Schema(type=openapi.TYPE_STRING),
        "oob_code": openapi.Schema(type=openapi.TYPE_STRING),
        "new_password": openapi.Schema(type=openapi.TYPE_STRING),
        #"idToken": openapi.Schema(type=openapi.TYPE_STRING),
      },
      required=["email", "oob_code", "new_password"],
    ),
    responses={200: "Password Updated", 400: "invalid code"},
  )
  def post(self, request: Request):
    email = request.data.get("email")
    oob = request.data.get("oob_code")
    new_password = request.data.get("new_password")
    
    if not all([email, oob, new_password]):
      return Response(
        {"status": "failed", "message": "oob and new pw required"},
        status=status.HTTP_400_BAD_REQUEST,
      )
    
    if len(new_password) < 8:
        return Response({'status': 'failed', 'message': 'Password must be at least 8 characters.'},
                          status=status.HTTP_400_BAD_REQUEST)

    if not re.match(r'^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*()_+{}\[\]:;<>,.?~\\-]).{8,}$', new_password):
        return Response({'status': 'failed',
                          'message': 'Password must contain uppercase, lowercase, digit, and special character.'},
                          status=status.HTTP_400_BAD_REQUEST)
    
    try:
      #change pw in firebase
      auth.verify_password_reset_code(oob, new_password)
    except Exception as e:
      return Response(
        {"status": "failed", "message": f"Firebase verification failed, {str(e)}"},
        status=status.HTTP_400_BAD_REQUEST,
      )
      
    #now change django after firebase was successful
    try:
      dj_user = User.objects.get(email=email)
      dj_user.set_password(new_password)
      dj_user.save()
    except User.DoesNotExist:
      pass
    
    return Response(
      {"status": "success", "message": "password updated successfully (final)"},
        status=status.HTTP_200_OK,
    )
  
class AuthDeleteAccountInitView(APIView):
  #body: none --> should send 2fa delete email
  permission_classes = [AllowAny]
  authentication_classes = []
    
  @swagger_auto_schema(
    operation_summary="start account deletion by sending 2fa email",
    tags=["User Management"],
    manual_parameters=[
      openapi.Parameter(
        "Authorization",
        openapi.IN_HEADER,
        description="Bearer <Firebase ID Token>",
        type=openapi.TYPE_STRING,
        required=True,
      ),
    ],
    responses={200: "email sent", 401: "Unauthorized"},
  )
  def post(self, request: Request):
    dj_user, ctx, err = _verify_and_get_user(request)
    if err:
      return err
      
    id_token = ctx["id_token"]
    try:
      #firebase sends verification email via builtin function
      auth.send_email_verification(id_token)
      return Response(
        {
          "status": "success",
          "message": f"A verification email has been sent to {dj_user.email}.",
        },
        status=status.HTTP_200_OK,
      )
    except Exception as e:
      return Response(
        {"status": "failed", "message": str(e)},
        status=status.HTTP_400_BAD_REQUEST,
      )
      
class AuthDeleteAccountConfirmView(APIView):
  # confirm deletion after user confirms via email
  #body: none
  permission_classes = [AllowAny]
  authentication_classes = []
  
  @swagger_auto_schema(
    operation_summary="Confirm account deletion(requires verification email)",
    tags=["User Management"],
    manual_parameters=[
      openapi.Parameter(
        "Authorization",
        openapi.IN_HEADER,
        description="Bearer <Firebase ID Token>",
        type=openapi.TYPE_STRING,
        required=True,
      )
    ],
    responses={200: "deleted", 401: "unauthorized", 400: "email not verified"},
  )
  def post(self, request:Request):
    dj_user, ctx, err = _verify_and_get_user(request)
    if err:
      return err

    id_token = ctx["id_token"]
    
    #check email verification using firebase
    try:
      info = auth.get_account_info(id_token)
      users = info.get("users", [])
      if not users or not users[0].get("emailVerified", False):
        return Response(
          {
            "status": "failed",
            "message": "email not verified yet",
          },
          status=status.HTTP_400_BAD_REQUEST,
        )
    except Exception as e:
      return Response(
        {"status": "failed", "message":f"could not fetch account: {str(e)}"},
        status=status.HTTP_400_BAD_REQUEST,
      )
    
    #delete from firebase&django
    try:
      auth.delete_user_account(id_token)
    except Exception as e:
      return Response(
        {"status": "failed", "message":f"Firebase deletion failed for account: {str(e)}"},
        status=status.HTTP_400_BAD_REQUEST,
      )
    email = dj_user.email
    dj_user.delete()
    logout(request)
    return Response(
      {"status": "success", "message":f"Account email: {email} deleted."},
        status=status.HTTP_200_OK,
    )
  
  # def post(self, request: Request):
  # django_user, ctx, err = _verify_and_get_user(request)
  # if err:
  #   return err

  # current = request.data.get("current_password")
  # new = request.data.get("new_password")
  # # TODO: retrieve email from django_user?
  # if not current or not new:
  #   return Response(
  #     {"status": "failed", "message": "Missing Fields"},
  #     status=status.HTTP_400_BAD_REQUEST,
  #   )
  # # check current pw
  # if not check_password(current, django_user.password):
  #   return Response(
  #     {"status": "failed", "message": "Incorrect current password"},
  #     status=status.HTTP_400_BAD_REQUEST,
  #   )

  # #update pw in django
  # django_user.set_password(new)
  # django_user.save()
  # #update pw in firebase with idTooken
  # id_token = ctx["id_token"]
  # try:# TODO: FINISH this function


# This directly deletes the account with the given email from Django
# This should only be used in the delete_users script
class AuthDeleteAccountFromDjangoView(APIView):

  permission_classes = [AllowAny]
  authentication_classes = []
  
  @swagger_auto_schema(
    operation_summary="Delete account from",
    tags=["User Management"],
    request_body=openapi.Schema(
      type=openapi.TYPE_OBJECT,
      properties={
        "email": openapi.Schema(type=openapi.TYPE_STRING),
      },
      required=["email"],
    ),
    responses={200: "deleted", 400: "account with email does not exist"},
  )
  def post(self, request:Request):
    email = request.data.get("email")

    try:
      user = User.objects.get(email=email)
      user.delete()
    except Exception as e:
      return Response(
        {"status": "failed", "message":f"Account deletion failed for {email}"},
        status=status.HTTP_400_BAD_REQUEST,
      )

    return Response(
      {"status": "success", "message":f"Account email: {email} deleted."},
        status=status.HTTP_200_OK,
    )
  


class AuthChangePasswordInitView(APIView):
  #post body should have: { email, current_password (optional) }-->should send firebase reset email
  permission_classes = [AllowAny]
  authentication_classes = []
  @swagger_auto_schema(
    operation_summary="Change password with firebase email send",
    tags=["User Management"],
    request_body=openapi.Schema(
      type=openapi.TYPE_OBJECT,
      properties={
        "email": openapi.Schema(type=openapi.TYPE_STRING),
        "current_password": openapi.Schema(type=openapi.TYPE_STRING),
        #"new_password": openapi.Schema(type=openapi.TYPE_STRING),
        #"idToken": openapi.Schema(type=openapi.TYPE_STRING),
      },
      required=["email"],
    ),
    responses={200: "Password Email Sent", 400: "Bad request"},
  )
  def post(self, request: Request):
    email = request.data.get("email")
    current_pw = request.data.get("current_password")
    
    if not email:
      return Response(
        {"status": "failed", "message": "email required"},
        status=status.HTTP_400_BAD_REQUEST,
      )
    
    try:
      dj_user = User.objects.get(email=email)
      if current_pw and not check_password(current_pw, dj_user.password):
        return Response(
          {"status": "failed", "message": "password incorrect"},
          status=status.HTTP_400_BAD_REQUEST,
        )
    except User.DoesNotExist:
      return Response(
        {"status": "failed", "message": "user not found"},
        status=status.HTTP_404_NOT_FOUND,
      )
    
    try:
      #firebase sends email here
      auth.send_password_reset_email(email)
      return Response(
        {"status": "success", "message": "pw reset email sent"},
        status=status.HTTP_200_OK,
      )
    except Exception as e:
      return Response(
        {"status": "failed", "message": str(e)},
        status=status.HTTP_400_BAD_REQUEST,
      )

#user clicked on change pw 2fa email link
class AuthChangePasswordConfirmView(APIView):
  #body: {email, oob_code, new_password} --> takes firebase oob code and updates django
  permission_classes = [AllowAny]
  authentication_classes = []
  
  @swagger_auto_schema(
    operation_summary="CONFIRM Change password with 2fa",
    tags=["User Management"],
    request_body=openapi.Schema(
      type=openapi.TYPE_OBJECT,
      properties={
        "email": openapi.Schema(type=openapi.TYPE_STRING),
        "oob_code": openapi.Schema(type=openapi.TYPE_STRING),
        "new_password": openapi.Schema(type=openapi.TYPE_STRING),
        #"idToken": openapi.Schema(type=openapi.TYPE_STRING),
      },
      required=["email", "oob_code", "new_password"],
    ),
    responses={200: "Password Updated", 400: "invalid code"},
  )
  def post(self, request: Request):
    email = request.data.get("email")
    oob = request.data.get("oob_code")
    new_password = request.data.get("new_password")
    
    if not all([email, oob, new_password]):
      return Response(
        {"status": "failed", "message": "oob and new pw required"},
        status=status.HTTP_400_BAD_REQUEST,
      )
    try:
      #change pw in firebase
      auth.verify_password_reset_code(oob, new_password)
    except Exception as e:
      return Response(
        {"status": "failed", "message": f"Firebase verification failed, {str(e)}"},
        status=status.HTTP_400_BAD_REQUEST,
      )
      
    #now change django after firebase was successful
    try:
      dj_user = User.objects.get(email=email)
      dj_user.set_password(new_password)
      dj_user.save()
    except User.DoesNotExist:
      pass
    
    return Response(
      {"status": "success", "message": "password updated successfully (final)"},
        status=status.HTTP_200_OK,
    )
  
class AuthDeleteAccountInitView(APIView):
  #body: none --> should send 2fa delete email
  permission_classes = [AllowAny]
  authentication_classes = []
    
  @swagger_auto_schema(
    operation_summary="start account deletion by sending 2fa email",
    tags=["User Management"],
    manual_parameters=[
      openapi.Parameter(
        "Authorization",
        openapi.IN_HEADER,
        description="Bearer <Firebase ID Token>",
        type=openapi.TYPE_STRING,
        required=True,
      ),
    ],
    responses={200: "email sent", 401: "Unauthorized"},
  )
  def post(self, request: Request):
    dj_user, ctx, err = _verify_and_get_user(request)
    if err:
      return err
      
    id_token = ctx["id_token"]
    try:
      #firebase sends verification email via builtin function
      auth.send_email_verification(id_token)
      return Response(
        {
          "status": "success",
          "message": f"A verification email has been sent to {dj_user.email}.",
        },
        status=status.HTTP_200_OK,
      )
    except Exception as e:
      return Response(
        {"status": "failed", "message": str(e)},
        status=status.HTTP_400_BAD_REQUEST,
      )
      
class AuthDeleteAccountConfirmView(APIView):
  # confirm deletion after user confirms via email
  #body: none
  permission_classes = [AllowAny]
  authentication_classes = []
  
  @swagger_auto_schema(
    operation_summary="Confirm account deletion(requires verification email)",
    tags=["User Management"],
    manual_parameters=[
      openapi.Parameter(
        "Authorization",
        openapi.IN_HEADER,
        description="Bearer <Firebase ID Token>",
        type=openapi.TYPE_STRING,
        required=True,
      )
    ],
    responses={200: "deleted", 401: "unauthorized", 400: "email not verified"},
  )
  def post(self, request:Request):
    dj_user, ctx, err = _verify_and_get_user(request)
    if err:
      return err

    id_token = ctx["id_token"]
    
    #check email verification using firebase
    try:
      info = auth.get_account_info(id_token)
      users = info.get("users", [])
      if not users or not users[0].get("emailVerified", False):
        return Response(
          {
            "status": "failed",
            "message": "email not verified yet",
          },
          status=status.HTTP_400_BAD_REQUEST,
        )
    except Exception as e:
      return Response(
        {"status": "failed", "message":f"could not fetch account: {str(e)}"},
        status=status.HTTP_400_BAD_REQUEST,
      )
    
    #delete from firebase&django
    try:
      auth.delete_user_account(id_token)
    except Exception as e:
      return Response(
        {"status": "failed", "message":f"Firebase deletion failed for account: {str(e)}"},
        status=status.HTTP_400_BAD_REQUEST,
      )
    email = dj_user.email
    dj_user.delete()
    logout(request)
    return Response(
      {"status": "success", "message":f"Account email: {email} deleted."},
        status=status.HTTP_200_OK,
    )
  
  # def post(self, request: Request):
  # django_user, ctx, err = _verify_and_get_user(request)
  # if err:
  #   return err

  # current = request.data.get("current_password")
  # new = request.data.get("new_password")
  # # TODO: retrieve email from django_user?
  # if not current or not new:
  #   return Response(
  #     {"status": "failed", "message": "Missing Fields"},
  #     status=status.HTTP_400_BAD_REQUEST,
  #   )
  # # check current pw
  # if not check_password(current, django_user.password):
  #   return Response(
  #     {"status": "failed", "message": "Incorrect current password"},
  #     status=status.HTTP_400_BAD_REQUEST,
  #   )

  # #update pw in django
  # django_user.set_password(new)
  # django_user.save()
  # #update pw in firebase with idTooken
  # id_token = ctx["id_token"]
  # try:# TODO: FINISH this function
    

class AuthCreateNewUserView(APIView):
    serializer_class = ApplicantSignupSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    permission_classes = [AllowAny]
    authentication_classes = []
    # @swagger_auto_schema(
    #     operation_summary='Create a new user',
    #     operation_description='Create a new user by providing the required fields.',
    #     tags=['User Management'],
    #     request_body=UserSerializer,
    #     responses={201: UserSerializer(many=False), 400: 'User creation failed.'}
    # )

    @swagger_auto_schema(
        operation_summary='Create a new user (employer or applicant)',
        operation_description='Provide email, password, name, and role (employer/applicant). Employers must also provide company info.',
        tags=['User Management'],
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                'role': openapi.Schema(type=openapi.TYPE_STRING, description="employer or applicant"),
                'email': openapi.Schema(type=openapi.TYPE_STRING),
                'password': openapi.Schema(type=openapi.TYPE_STRING),
                'first_name': openapi.Schema(type=openapi.TYPE_STRING),
                'last_name': openapi.Schema(type=openapi.TYPE_STRING),
                # employer-specific
                'company_name': openapi.Schema(type=openapi.TYPE_STRING),
                'job_title': openapi.Schema(type=openapi.TYPE_STRING),
                'company_size': openapi.Schema(type=openapi.TYPE_STRING),
                'company_website': openapi.Schema(type=openapi.TYPE_STRING),
                # applicant-specific
                'resume': openapi.Schema(type=openapi.TYPE_STRING),
                'skills': openapi.Schema(type=openapi.TYPE_STRING),
                'portfolio_url': openapi.Schema(type=openapi.TYPE_STRING),
            }
        ),
        responses={201: UserSerializer(many=False), 400: 'User creation failed.'}
    )

    def post(self, request, format=None):
      data = request.data.copy()
      email = data.get('email')
      password = data.get('password')
      first_name = data.get('first_name')
      last_name = data.get('last_name')
      role = data.get('role')

      included_fields = [email, password, first_name, last_name, role]
      if not all(included_fields):
        return Response({'status': 'failed', 'message': 'All fields are required.'},
                          status=status.HTTP_400_BAD_REQUEST)

      if not re.match(r'[^@]+@[^@]+\.[^@]+', email):
        return Response({'status': 'failed', 'message': 'Enter a valid email address.'},
                          status=status.HTTP_400_BAD_REQUEST)

      if len(password) < 8:
        return Response({'status': 'failed', 'message': 'Password must be at least 8 characters.'},
                          status=status.HTTP_400_BAD_REQUEST)

      if not re.match(r'^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*()_+{}\[\]:;<>,.?~\\-]).{8,}$', password):
        return Response({'status': 'failed',
                          'message': 'Password must contain uppercase, lowercase, digit, and special character.'},
                          status=status.HTTP_400_BAD_REQUEST)

      try:
        # pick serializer
        if role == "employer":
          serializer = EmployerSignupSerializer(data=data)
        elif role == "applicant":
          serializer = ApplicantSignupSerializer(data=data)
        else:
            return Response({'status': 'failed', 'message': 'Invalid role specified.'},
                              status=status.HTTP_400_BAD_REQUEST)

        if serializer.is_valid():
          user = serializer.save()

          # create firebase user
          firebase_user = auth.create_user_with_email_and_password(email, password)
          uid = firebase_user['localId']
          data['firebase_uid'] = uid
          
          # Update the user with firebase_uid
          user.firebase_uid = uid
          user.save()
          
          # Return full user data including profiles and embeddings
          return Response({
                'status': 'success',
                'message': f'{role.capitalize()} account created successfully.',
                'data': MeSerializer(user).data 
          }, status=status.HTTP_201_CREATED)

        # # serializer invalid -> rollback firebase
        # if 'idToken' in firebase_user:
        #   auth.delete_user_account(firebase_user['idToken'])

        return Response({
            'status': 'failed',
            'message': 'User signup failed.',
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

      except Exception as e:
        print("Signup Exception:", str(e))
        return Response({'status': 'failed', 'message': str(e)},
                          status=status.HTTP_400_BAD_REQUEST)     
      

class CreateCompanyView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    def post(self, request):
        name = request.data.get("name")
        size = request.data.get("size", "")
        website = request.data.get("website", "")
        if not name:
            return Response({"error": "Company name is required"}, status=status.HTTP_400_BAD_REQUEST)

        company, created = Company.objects.get_or_create(
            name__iexact=name,
            defaults={"name": name, "size": size, "website": website},
        )

        if not created:
            return Response({"message": "Company already exists"}, status=status.HTTP_200_OK)

        return Response({"message": "Company created successfully"}, status=status.HTTP_201_CREATED)


class JoinCompanyView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    def post(self, request):
        user, ctx, err = _verify_and_get_user(request)
        if err:
            return err
        company_name = request.data.get("company_name")
        job_title = request.data.get("job_title", "")
        if not company_name:
            return Response({"status": "failed", "message": "company_name is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            company = Company.objects.get(name__iexact=company_name)
        except Company.DoesNotExist:
            return Response({"error": "Company not found"}, status=status.HTTP_404_NOT_FOUND)

        profile, created = EmployerProfile.objects.get_or_create(
            user=user,
            defaults={"company": company, "job_title": job_title},
        )

        if not created:
            # Update job_title if profile already exists
            profile.job_title = job_title
            profile.company = company
            profile.save()
        return Response({"message": "Joined company successfully"}, status=status.HTTP_200_OK)
    

class GetCompanyView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    def get(self, request):
        """
        Returns company details for a given user
        """
        # verify user via Firebase token
        user, ctx, err = _verify_and_get_user(request)
        if err:
            return err
        
        # Try to get employer profile
        try:
            employer_profile = EmployerProfile.objects.get(user=user)
        except EmployerProfile.DoesNotExist:
            return Response({"status": "failed", "message": "User does not belong to a company"}, status=status.HTTP_404_NOT_FOUND)

        company = employer_profile.company
        data = {
            "company_name": company.name,
            "job_title": employer_profile.job_title,
            "company_size": company.size,
            "company_website": company.website
        }
        return Response({"status": "success", "data": data}, status=status.HTTP_200_OK)

class AuthLoginExisitingUserView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    @swagger_auto_schema(
        operation_summary='Login an existing user',
        operation_description='Login an existing user by providing the required fields.',
        tags=['User Management'],
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                'email': openapi.Schema(type=openapi.TYPE_STRING, description='Email of the user'),
                'password': openapi.Schema(type=openapi.TYPE_STRING, description='Password of the user')
            }
        ),
        responses={200: UserSerializer(many=False), 404: 'User does not exist.'}
    )
    def post(self, request: Request):
        data = request.data.copy()
        email = data.get('email')
        password = data.get('password')
        try:
          user = auth.sign_in_with_email_and_password(email, password)
        except Exception:
          bad_response = {
          'status': 'Failed',
          'message': 'Invalid email or password.'
          }
          return Response(bad_response, status=status.HTTP_400_BAD_REQUEST)
        try:
          existing_user = User.objects.get(email=email)
          # update password if it is not the same as the one in the database
          if not check_password(password, existing_user.password):
            existing_user.set_password(password)
            existing_user.save()
          # make sure firebase_uid is stored
          if not existing_user.firebase_uid:
            existing_user.firebase_uid = user['localId']
            existing_user.save()
          
          serializer = UserSerializer(existing_user)
          user_base_payload = serializer.data

          # add employer fields if user is an employer
          employer = EmployerProfile.objects.filter(user=existing_user).first()
          if employer:
            user_base_payload.update({
              'company_name': employer.company.name,
              'job_title': employer.job_title,
              'company_size': employer.company.size,
              'company_website': employer.company.website,
              'notifications_enabled': employer.notifications_enabled,
          })

          # add applicant fields if user is an applicant
          applicant = ApplicantProfile.objects.filter(user=existing_user).first()
          if applicant:
            user_base_payload.update({
              'notifications_enabled': applicant.notifications_enabled,
          })

          extra_data = {
              'firebase_id': user['localId'],
              'firebase_access_token': user['idToken'],
              'firebase_refresh_token': user['refreshToken'],
              'firebase_expires_in': user['expiresIn'],
              'firebase_kind': user['kind'],
              'user_data': user_base_payload
          }
          response = {
              'status': 'success',
              'message': 'User logged in successfully.',
              'data': extra_data
          }
          return Response(response, status=status.HTTP_200_OK)
        except User.DoesNotExist:
          # auth.delete_user_account(user['idToken'])
          bad_response = {
            'status': 'failed',
            'message': 'User does not exist.'
          }
          return Response(bad_response, status=status.HTTP_404_NOT_FOUND)

class MeView(APIView):
  
  # returns currently signed in user by firebase id
  permission_classes = [AllowAny]
  authentication_classes = []
  
  @swagger_auto_schema(
    operation_summary="grabs current user data",
    tags=["User Management"],
    manual_parameters=[
      openapi.Parameter(
        "Authorization",
        openapi.IN_HEADER,
        description="Bearer <Firebase ID Token>",
        type=openapi.TYPE_STRING,
        required=True,
      )
    ],
    responses={200: MeSerializer(many=False), 401: "Unauthorized"},
  )
  def get(self, request:Request):


    print("HEADERS: ", request.headers)

    dj_user, ctx, err = _verify_and_get_user(request)
    if err:
      return err
    data = MeSerializer(dj_user).data
    return Response(data, status=status.HTTP_200_OK)
  
class AuthDeleteAccountView(APIView):
  permission_classes = [AllowAny]
  authentication_classes = []

  @swagger_auto_schema(
    operation_summary="Delete account by verifying current password (no email)",
    tags=["User Management"],
    request_body=openapi.Schema(
      type=openapi.TYPE_OBJECT,
      properties={
        "email": openapi.Schema(type=openapi.TYPE_STRING),
        "current_password": openapi.Schema(type=openapi.TYPE_STRING),
      },
      required=["email", "current_password"],
    ),
    responses={200: "deleted", 400: "bad request / wrong password", 404: "user not found"}
  )
  def post(self, request: Request):
    email = request.data.get("email")
    current_pw = request.data.get("current_password")

    if not email or not current_pw:
      return Response({"status": "failed", "message": "email and current_password required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
      dj_user = User.objects.get(email=email)
    except User.DoesNotExist:
      return Response({"status": "failed", "message": "user not found"}, status=status.HTTP_404_NOT_FOUND)

    if not check_password(current_pw, dj_user.password):
      return Response({"status": "failed", "message": "incorrect password"}, status=status.HTTP_400_BAD_REQUEST)

    # Best: delete Firebase by UID using Admin SDK
    try:
      if dj_user.firebase_uid:
        firebase_admin_auth.delete_user(dj_user.firebase_uid)
    except Exception as e:
      # If deletion in Firebase fails, you can either abort or continue; here we abort.
      return Response({"status": "failed", "message": f"firebase deletion failed: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

    email_str = dj_user.email
    dj_user.delete()
    logout(request)

    return Response({"status": "success", "message": f"Account {email_str} deleted."}, status=status.HTTP_200_OK)
  
class AuthLogoutUserView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [FirebaseAuthentication]

    @swagger_auto_schema(
        operation_summary="Logout a user",
        operation_description="Invalidate the user's session and tokens.",
        tags=["User Management"],
        responses={200: 'Successfully logged out', 400: 'Logout failed'}
    )
    def post(self, request):
        try:
            # Get token from request headers (Authorization: Bearer <idToken>)
            id_token = request.headers.get('Authorization', '').replace('Bearer ', '')

            if id_token:
                # id_token = long JWT string from frontend
                decoded_token = firebase_admin_auth.verify_id_token(id_token)
                uid = decoded_token['uid']  # extract the UID
                # Revoke Firebase token
                firebase_admin_auth.revoke_refresh_tokens(uid)
            
            # If using Django session authentication
            #if hasattr(request, 'session'):
                #request.session.flush()

            return Response({'status': 'success', 'message': 'User logged out successfully.'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'status': 'failed', 'message': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def get(self, request: Request):
      dj_user, ctx, err = _verify_and_get_user(request)
      if err:
          return err

      data = MeSerializer(dj_user, context={"request": request}).data
      return Response(data, status=status.HTTP_200_OK)
  
class UploadProfileImageView(APIView):
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        dj_user, ctx, err = _verify_and_get_user(request)
        if err:
            return err

        file = request.FILES.get("profile_image")
        if not file:
            return Response({"status": "failed", "message": "No image uploaded"}, status=400)

        profile = getattr(dj_user, "applicant_profile", None) or getattr(dj_user, "employer_profile", None)
        if not profile:
            return Response({"status": "failed", "message": "Profile not found"}, status=400)

        profile.profile_image = file
        profile.save()

        image_url = request.build_absolute_uri(profile.profile_image.url)

        return Response(
            {"status": "success", "message": "Profile image uploaded successfully", "profile_image": image_url},
            status=200,
        )
    
class ProfileUpdateView(APIView):
  parser_classes = [MultiPartParser, FormParser]
  authentication_classes = [FirebaseAuthentication]
  permission_classes = [IsAuthenticated]

  def put(self, request):
    dj_user, ctx, err = _verify_and_get_user(request)
    if err:
        return err

    data = request.data.copy()

    try:
        with transaction.atomic():
            # update user first/last name
            for field in ["first_name", "last_name"]:
              if field in data:
                setattr(dj_user, field, data[field])
            dj_user.save()

            # include profile image in serializer data
            if "profile_image" in request.FILES:
              data["profile_image"] = request.FILES["profile_image"]

            # employer updates
            if dj_user.role == "employer":
              profile = dj_user.employer_profile
              company = profile.company

              # update company fields directly
              if "company_name" in data:
                company.name = data["company_name"]
              if "company_website" in data:
                company.website = data["company_website"]
              company.save()

              serializer = EmployerProfileSerializer(profile, data=data, partial=True)

            # applicant updates
            else:
              profile = dj_user.applicant_profile
              serializer = ApplicantProfileSerializer(profile, data=data, partial=True)

            if serializer.is_valid():
              serializer.save()
            else:
              return Response(serializer.errors, status=400)

        return Response({"status": "success", "message": "Profile updated successfully."}, status=200)

    except Exception as e:
      return Response({"status": "failed", "message": str(e)}, status=400)


class NotificationPreferenceView(APIView):
  authentication_classes = [FirebaseAuthentication]
  permission_classes = [IsAuthenticated]

  @swagger_auto_schema(
    operation_summary='Update notification preference',
    tags=['User Management'],
    request_body=openapi.Schema(
      type=openapi.TYPE_OBJECT,
      properties={
        'notifications_enabled': openapi.Schema(type=openapi.TYPE_BOOLEAN, description='Enable or disable notifications'),
      },
      required=['notifications_enabled'],
    ),
    responses={200: "Notification preference updated", 400: "Bad request"},
  )
  def put(self, request: Request):
    dj_user, ctx, err = _verify_and_get_user(request)
    if err:
      return err

    notifications_enabled = request.data.get('notifications_enabled')

    if notifications_enabled is None:
      return Response(
        {'status': 'failed', 'message': 'notifications_enabled field is required'},
        status=status.HTTP_400_BAD_REQUEST,
      )

    try:
      if dj_user.role == 'employer':
        profile = dj_user.employer_profile
      else:
        profile = dj_user.applicant_profile

      profile.notifications_enabled = notifications_enabled
      profile.save()

      return Response(
        {
          'status': 'success',
          'message': 'Notification preference updated successfully.',
          'notifications_enabled': profile.notifications_enabled,
        },
        status=status.HTTP_200_OK,
      )
    except Exception as e:
      return Response(
        {'status': 'failed', 'message': str(e)},
        status=status.HTTP_400_BAD_REQUEST,
      )


class BookmarkJobPostingView(APIView):
  authentication_classes = [FirebaseAuthentication]
  permission_classes = [IsAuthenticated]

  @swagger_auto_schema(
    operation_summary='Toggle bookmark for a job posting',
    tags=['Job Postings'],
    request_body=openapi.Schema(
      type=openapi.TYPE_OBJECT,
      properties={
        'job_id': openapi.Schema(type=openapi.TYPE_STRING, description='ID of the job posting'),
      },
      required=['job_id'],
    ),
    responses={200: "Bookmark toggled", 400: "Bad request", 403: "Forbidden", 404: "Not found"},
  )
  def post(self, request: Request):
    dj_user, ctx, err = _verify_and_get_user(request)
    if err:
      return err

    if dj_user.role != 'applicant':
      return Response(
        {'status': 'error', 'message': 'Only applicants can bookmark job postings'},
        status=status.HTTP_403_FORBIDDEN,
      )

    job_id = request.data.get('job_id')
    if not job_id:
      return Response(
        {'status': 'error', 'message': 'job_id is required'},
        status=status.HTTP_400_BAD_REQUEST,
      )

    try:
      from accounts.models import ApplicantProfile, JobPosting

      applicant_profile = ApplicantProfile.objects.get(user=dj_user)
      job_posting = JobPosting.objects.get(id=job_id)

      # Toggle bookmark
      if applicant_profile.bookmarked_jobs.filter(id=job_id).exists():
        applicant_profile.bookmarked_jobs.remove(job_posting)
        bookmarked = False
      else:
        applicant_profile.bookmarked_jobs.add(job_posting)
        bookmarked = True

      return Response({
        'status': 'success',
        'bookmarked': bookmarked,
        'message': 'Job bookmarked successfully' if bookmarked else 'Job unbookmarked successfully'
      }, status=status.HTTP_200_OK)

    except ApplicantProfile.DoesNotExist:
      return Response(
        {'status': 'error', 'message': 'Applicant profile not found'},
        status=status.HTTP_404_NOT_FOUND,
      )
    except JobPosting.DoesNotExist:
      return Response(
        {'status': 'error', 'message': 'Job posting not found'},
        status=status.HTTP_404_NOT_FOUND,
      )
    except Exception as e:
      return Response(
        {'status': 'error', 'message': str(e)},
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
      )


class CreateNotificationView(APIView):
  authentication_classes = [FirebaseAuthentication]
  permission_classes = [IsAuthenticated]

  @swagger_auto_schema(
    operation_summary='Create a notification for a user',
    tags=['Notifications'],
    request_body=openapi.Schema(
      type=openapi.TYPE_OBJECT,
      properties={
        'user_id': openapi.Schema(type=openapi.TYPE_STRING, description='ID of the user to notify'),
        'title': openapi.Schema(type=openapi.TYPE_STRING, description='Notification title'),
        'message': openapi.Schema(type=openapi.TYPE_STRING, description='Notification message'),
        'notification_type': openapi.Schema(
          type=openapi.TYPE_STRING,
          enum=['info', 'success', 'warning', 'error'],
          description='Type of notification',
          default='info'
        ),
        'job_posting_id': openapi.Schema(type=openapi.TYPE_STRING, description='Optional: ID of related job posting'),
        'related_user_id': openapi.Schema(type=openapi.TYPE_STRING, description='Optional: ID of related user'),
      },
      required=['user_id', 'title', 'message'],
    ),
    responses={201: NotificationSerializer(many=False), 400: "Bad request", 404: "User not found"},
  )
  def post(self, request: Request):
    # Verify the authenticated user (the one creating the notification)
    dj_user, ctx, err = _verify_and_get_user(request)
    if err:
      return err

    serializer = CreateNotificationSerializer(data=request.data)
    if not serializer.is_valid():
      return Response(
        {'status': 'failed', 'message': 'Invalid data', 'errors': serializer.errors},
        status=status.HTTP_400_BAD_REQUEST,
      )

    user_id = serializer.validated_data.get('user_id')
    if not user_id:
      return Response(
        {'status': 'failed', 'message': 'user_id is required'},
        status=status.HTTP_400_BAD_REQUEST,
      )

    try:
      target_user = User.objects.get(id=user_id)
    except User.DoesNotExist:
      return Response(
        {'status': 'failed', 'message': 'User not found'},
        status=status.HTTP_404_NOT_FOUND,
      )

    # Create notification
    notification_data = {
      'user': target_user,
      'title': serializer.validated_data['title'],
      'message': serializer.validated_data['message'],
      'notification_type': serializer.validated_data.get('notification_type', 'info'),
    }

    # Handle optional job_posting_id
    job_posting_id = serializer.validated_data.get('job_posting_id')
    if job_posting_id:
      try:
        job_posting = JobPosting.objects.get(id=job_posting_id)
        notification_data['job_posting'] = job_posting
      except JobPosting.DoesNotExist:
        return Response(
          {'status': 'failed', 'message': 'Job posting not found'},
          status=status.HTTP_404_NOT_FOUND,
        )

    # Handle optional related_user_id
    related_user_id = serializer.validated_data.get('related_user_id')
    if related_user_id:
      try:
        related_user = User.objects.get(id=related_user_id)
        notification_data['related_user'] = related_user
      except User.DoesNotExist:
        return Response(
          {'status': 'failed', 'message': 'Related user not found'},
          status=status.HTTP_404_NOT_FOUND,
        )

    notification = Notification.objects.create(**notification_data)
    response_serializer = NotificationSerializer(notification)

    return Response(
      {
        'status': 'success',
        'message': 'Notification created successfully',
        'notification': response_serializer.data,
      },
      status=status.HTTP_201_CREATED,
    )


class GetNotificationsView(APIView):
  authentication_classes = [FirebaseAuthentication]
  permission_classes = [IsAuthenticated]

  @swagger_auto_schema(
    operation_summary='Get all notifications for the authenticated user',
    tags=['Notifications'],
    manual_parameters=[
      openapi.Parameter(
        "Authorization",
        openapi.IN_HEADER,
        description="Bearer <Firebase ID Token>",
        type=openapi.TYPE_STRING,
        required=True,
      ),
      openapi.Parameter(
        "read",
        openapi.IN_QUERY,
        description="Filter by read status (true/false). Omit to get all notifications.",
        type=openapi.TYPE_BOOLEAN,
        required=False,
      ),
    ],
    responses={200: NotificationSerializer(many=True), 401: "Unauthorized"},
  )
  def get(self, request: Request):
    dj_user, ctx, err = _verify_and_get_user(request)
    if err:
      return err

    # Get optional read filter from query params
    read_filter = request.query_params.get('read')
    notifications = Notification.objects.filter(user=dj_user)

    if read_filter is not None:
      read_bool = read_filter.lower() == 'true'
      notifications = notifications.filter(read=read_bool)

    serializer = NotificationSerializer(notifications, many=True)
    return Response(
      {
        'status': 'success',
        'count': len(serializer.data),
        'notifications': serializer.data,
      },
      status=status.HTTP_200_OK,
    )


class MarkNotificationReadView(APIView):
  authentication_classes = [FirebaseAuthentication]
  permission_classes = [IsAuthenticated]

  @swagger_auto_schema(
    operation_summary='Mark a notification as read',
    tags=['Notifications'],
    request_body=openapi.Schema(
      type=openapi.TYPE_OBJECT,
      properties={
        'notification_id': openapi.Schema(type=openapi.TYPE_STRING, description='ID of the notification'),
      },
      required=['notification_id'],
    ),
    responses={200: "Notification marked as read", 400: "Bad request", 404: "Notification not found"},
  )
  def post(self, request: Request):
    dj_user, ctx, err = _verify_and_get_user(request)
    if err:
      return err

    notification_id = request.data.get('notification_id')
    if not notification_id:
      return Response(
        {'status': 'failed', 'message': 'notification_id is required'},
        status=status.HTTP_400_BAD_REQUEST,
      )

    try:
      notification = Notification.objects.get(id=notification_id, user=dj_user)
      notification.read = True
      notification.save()

      serializer = NotificationSerializer(notification)
      return Response(
        {
          'status': 'success',
          'message': 'Notification marked as read',
          'notification': serializer.data,
        },
        status=status.HTTP_200_OK,
      )
    except Notification.DoesNotExist:
      return Response(
        {'status': 'failed', 'message': 'Notification not found'},
        status=status.HTTP_404_NOT_FOUND,
      )


class DeleteNotificationView(APIView):
  authentication_classes = [FirebaseAuthentication]
  permission_classes = [IsAuthenticated]

  @swagger_auto_schema(
    operation_summary='Delete a notification',
    tags=['Notifications'],
    manual_parameters=[
      openapi.Parameter(
        "Authorization",
        openapi.IN_HEADER,
        description="Bearer <Firebase ID Token>",
        type=openapi.TYPE_STRING,
        required=True,
      ),
      openapi.Parameter(
        "notification_id",
        openapi.IN_QUERY,
        description="ID of the notification to delete",
        type=openapi.TYPE_STRING,
        required=True,
      ),
    ],
    responses={200: "Notification deleted", 400: "Bad request", 404: "Notification not found"},
  )
  def delete(self, request: Request):
    dj_user, ctx, err = _verify_and_get_user(request)
    if err:
      return err

    # Try to get notification_id from query params first, then from request body
    notification_id = request.query_params.get('notification_id') or request.data.get('notification_id')
    if not notification_id:
      return Response(
        {'status': 'failed', 'message': 'notification_id is required'},
        status=status.HTTP_400_BAD_REQUEST,
      )

    try:
      notification = Notification.objects.get(id=notification_id, user=dj_user)
      notification.delete()

      return Response(
        {
          'status': 'success',
          'message': 'Notification deleted successfully',
        },
        status=status.HTTP_200_OK,
      )
    except Notification.DoesNotExist:
      return Response(
        {'status': 'failed', 'message': 'Notification not found'},
        status=status.HTTP_404_NOT_FOUND,
      )
