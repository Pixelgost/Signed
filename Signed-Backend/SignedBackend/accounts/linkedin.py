import random
from rest_framework.decorators import api_view
from rest_framework.response import Response
import time

USERS = {
    "victorgao0308" : {
        "firstName" : "Victor",
        "lastName" : "Gao",
        "email" : "",
        "major" : "CS + DS",
        "school" : "Purdue University",
        "company" : "",
        "position" : ""
    },
    "adhi-babu-9b6201250" : {
        "firstName" : "Adhi",
        "lastName" : "Babu",
        "email" : "",
        "major" : "Computer Science",
        "school" : "Purdue University",
        "company" : "",
        "position" : ""
    },
    "george-adams-7563279" : {
        "firstName" : "George",
        "lastName" : "Adams",
        "email" : "",
        "major" : "",
        "school" : "Purdue University",
        "company" : "Purdue University",
        "position" : "Teaching Professor of Computer Science"
    },
    "jvngyn" : {
        "firstName" : "Jeff",
        "lastName" : "Nguyen",
        "email" : "",
        "major" : "Healthcare Management and Leadership",
        "school" : "",
        "company" : "Amazon",
        "position" : "University Recruiter"
    },
    "gkangj" : {
        "firstName" : "Grace",
        "lastName" : "Kang",
        "email" : "",
        "major" : "Human Ecology",
        "school" : "The University of Texas at Austin",
        "company" : "Google",
        "position" : "Full Cycle Recruiter"
    }
}


@api_view(['GET'])
def autofill_from_linkedin(request):
    linkedin_user = request.query_params.get("user")

    # make it seem like we are actually fetching user info
    time.sleep(random.uniform(1, 2.5))

    if not linkedin_user or linkedin_user not in USERS:
        return Response({
                'status': 'error',
                'message': 'Linkedin profile does not exist'
            }, status=400)
    

    
    return Response({
                'status': 'success',
                'profile': USERS[linkedin_user]
            }, status=200)

