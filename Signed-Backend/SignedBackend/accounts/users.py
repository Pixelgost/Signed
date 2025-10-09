from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework import status
from .firebase_admin import db, auth


@api_view(['GET'])
@permission_classes([AllowAny])
def check_email(request):
        email = request.query_params.get("email", "").strip().lower()
        if not email:
            return Response({"error": "Email is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # This will raise an error if no user found
            user_record = auth.get_user_by_email(email)
            return Response({
                "exists": True,
                "uid": user_record.uid
            }, status=status.HTTP_200_OK)
        except auth.UserNotFoundError:
            return Response({"exists": False}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
@api_view(['GET'])
@permission_classes([AllowAny])
def change_password(request):
    email = request.query_params.get("email", "").strip().lower()
    new_password = request.query_params.get("new_password", "")
    if not email or not new_password:
        return Response(
            {"error": "Email and new_password are required"},
            status=status.HTTP_400_BAD_REQUEST
        )
    try:
        user_record = auth.get_user_by_email(email)
        auth.update_user(user_record.uid, password=new_password)
        return Response(
            {"success": True, "message": "Password updated successfully"},
            status=status.HTTP_200_OK
        )
    except auth.UserNotFoundError:
        return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
