from django.shortcuts import render

from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from .models import User
from .serializers import UserSerializer, EmployerSignupSerializer, ApplicantSignupSerializer
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
from rest_framework.permissions import AllowAny
from .firebase_auth.firebase_authentication import auth as firebase_admin_auth
from django.contrib.auth.hashers import check_password
from django.contrib.auth import get_user_model, logout
import re
from settings import auth
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

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
  except Exception:
    return None, None, Response(
      {"status": "failed", "message": "Missing Firebase ID Token"},
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
        # create firebase user
        firebase_user = auth.create_user_with_email_and_password(email, password)
        uid = firebase_user['localId']
        data['firebase_uid'] = uid

        # pick serializer
        if role == "employer":
          serializer = EmployerSignupSerializer(data=data)
        elif role == "applicant":
            serializer = ApplicantSignupSerializer(data=data)
        else:
            return Response({'status': 'failed', 'message': 'Invalid role specified.'},
                              status=status.HTTP_400_BAD_REQUEST)

        if serializer.is_valid():
          serializer.save()
          return Response({
                'status': 'success',
                'message': f'{role.capitalize()} account created successfully.',
                'data': UserSerializer(serializer.instance).data 
          }, status=status.HTTP_201_CREATED)
        else:
          # Debug: print errors to console/log
          print("Serializer errors:", serializer.errors)
          return Response({
              'status': 'failed',
              'message': 'User signup failed.',
              'errors': serializer.errors
          }, status=status.HTTP_400_BAD_REQUEST)

        # serializer invalid -> rollback firebase
        if 'idToken' in firebase_user:
          auth.delete_user_account(firebase_user['idToken'])

        return Response({
            'status': 'failed',
            'message': 'User signup failed.',
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

      except Exception as e:
        print("Signup Exception:", str(e))
        return Response({'status': 'failed', 'message': str(e)},
                          status=status.HTTP_400_BAD_REQUEST)     
      

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
          extra_data = {
              'firebase_id': user['localId'],
              'firebase_access_token': user['idToken'],
              'firebase_refresh_token': user['refreshToken'],
              'firebase_expires_in': user['expiresIn'],
              'firebase_kind': user['kind'],
              'user_data': serializer.data
          }
          response = {
              'status': 'success',
              'message': 'User logged in successfully.',
              'data': extra_data
          }
          return Response(response, status=status.HTTP_200_OK)
        except User.DoesNotExist:
          auth.delete_user_account(user['idToken'])
          bad_response = {
            'status': 'failed',
            'message': 'User does not exist.'
          }
          return Response(bad_response, status=status.HTTP_404_NOT_FOUND)
