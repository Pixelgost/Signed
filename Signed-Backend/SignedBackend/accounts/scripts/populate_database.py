import os
import requests
import random

from accounts.firebase_admin import credentials, auth
from django.core.files.uploadedfile import SimpleUploadedFile

PASSWORD = "!Password123"
CREATE_ACCOUNT_URL = "http://127.0.0.1:8000/api/v1/users/auth/sign-up/"  
CREATE_JOB_URL = "http://127.0.0.1:8000/api/v1/users/create-job-posting/"  
APPLY_TO_JOB_URL = "http://127.0.0.1:8000/api/v1/users/apply-to-job/"
ADD_IMPRESSION_URL = "http://127.0.0.1:8000/api/v1/users/add-impression/"
LIKE_JOB_URL = "http://127.0.0.1:8000/api/v1/users/like-job-posting/"


USERS = [
    {
        "role": "applicant",
        "email": "applicant1@example.com",
        "password": PASSWORD,
        "major": "Computer Science",
        "school": "Purdue",
        "first_name": "Blake",
        "last_name": "Carr",
        "personality_type": "Leader",
        "resume_file": os.path.join(os.path.dirname(__file__), "sample_resumes", "resume_cs_major.pdf")
    },
    {
        "role": "applicant",
        "email": "applicant2@example.com",
        "password": PASSWORD,
        "major": "Business",
        "school": "IU",
        "first_name": "Rudy",
        "last_name": "Brown",
        "personality_type": "Innovator",
        "resume_file": os.path.join(os.path.dirname(__file__), "sample_resumes", "resume_business_management_major.pdf")
    },  
    {
        "role": "applicant",
        "email": "applicant3@example.com",
        "password": PASSWORD,
        "major": "Math",
        "school": "MIT",
        "first_name": "Jo",
        "last_name": "Cherry",
        "personality_type": "Leader",
        "resume_file": os.path.join(os.path.dirname(__file__), "sample_resumes", "resume_math_major.pdf")
    },
    {
        "role": "applicant",
        "email": "applicant4@example.com",
        "password": PASSWORD,
        "major": "Econ",
        "school": "UIUC",
        "first_name": "Gabe",
        "last_name": "Woods",
        "personality_type": "Thinker",
        "resume_file": os.path.join(os.path.dirname(__file__), "sample_resumes", "resume_economics_major.pdf")
    },
    {
        "role": "employer",
        "email": "employer1@example.com",
        "password": PASSWORD,
        "first_name": "Kerry",
        "last_name": "Webb",
        "company_name": "Google",
        "job_title": "Recruiter",
        "company_size": "10000+",
        "user_linkedin_url": "https://www.linkedin.com/in/rebeccaksullivan/"
    },
    {
        "role": "employer",
        "email": "employer2@example.com",
        "password": PASSWORD,
        "first_name": "Sam",
        "last_name": "Cantu",
        "company_name": "Do it All Co.",
        "job_title": "Recruiter",
        "company_size": "100",
        "user_linkedin_url": "https://www.linkedin.com/in/oliverbriana/"
    },
    {
        "role": "employer",
        "email": "employer3@example.com",
        "password": PASSWORD,
        "first_name": "Erin",
        "last_name": "Porter",
        "company_name": "Google",
        "job_title": "Recruiter",
        "company_size": "10000+",
        "user_linkedin_url": "https://www.linkedin.com/in/huntermott/"
    }, 
]
employer_ids = []
employee_ids = []
job_ids = []
total_impressions = 0
total_applications = 0
total_likes = 0

# creates a job posting
def create_job_posting(media_items = [], company_logo = None, job_title = "", company = "", location = "", job_type = "", salary = "", company_size = "", tags = [], job_description = "", posted_by = ""):

    data = {
        "media_items": media_items,
        "company_logo": company_logo,
        "job_title": job_title,
        "company": company,
        "location": location,
        "job_type": job_type,
        "salary": salary,
        "company_size": company_size,
        "tags": tags,
        "job_description": job_description,
        "posted_by": posted_by
    }

    response = requests.post(CREATE_JOB_URL, json=data)


    if response.status_code == 200:
        job_ids.append(response.json()["posting id"])
        print(f"Created job posting {job_title} at {company}")
    else:
        print(f"Failed to create job posting. Response text: {response.text}")


# creates a random applicant
# these are dummy accounts used to show metrics
def create_random_applicant(i):
    data = {
        "role": "applicant",
        "email": f'random_applicant{i}@example.com',
        "password": PASSWORD,
        "major": random.choice(["Computer Science", "Business", "Econ", "Stats", "Math", "Physics"]),
        "school": random.choice(["Purdue", "UIUC", "IU", "MIT", "Stanford"]),
        "first_name": random.choice(["Olivia", "Mason", "Aria", "Liam", "Sophia", "Ethan", "Maya", "Noah", "Chloe", "Lucas", "Aiden", "Zara", "Caleb", "Ivy", "Julian"]),
        "last_name": random.choice(["Thompson", "Rivera", "Patel", "Bennett", "O'Connor", "Mitchell", "Russo", "Harrington", "Kwon", "Delgado", "Fischer", "Navarro", "Grant", "Tanaka", "Whitaker"]),
        "skills": "",
        "portfolio_url": "https://portfolio.example.com",
        "personality_type": random.choice(["Innovator", "Leader", "Thinker", "Collaborator"]),
    }


    resume_file = random.choice([os.path.join(os.path.dirname(__file__), "sample_resumes", "resume_business_management_major.pdf"),
                                 os.path.join(os.path.dirname(__file__), "sample_resumes", "resume_business_marketing_major.pdf"),
                                 os.path.join(os.path.dirname(__file__), "sample_resumes", "resume_cs_major.pdf"),
                                 os.path.join(os.path.dirname(__file__), "sample_resumes", "resume_economics_major.pdf"),
                                 os.path.join(os.path.dirname(__file__), "sample_resumes", "resume_math_major.pdf")])
    
    with open(resume_file, "rb") as f:
        resume_file = SimpleUploadedFile(f.name, f.read(), content_type="application/pdf")

        files = {
            "resume_file": resume_file
        }

    response = requests.post(CREATE_ACCOUNT_URL, data=data, files = files)

    if response.status_code == 201:
        employee_ids.append(response.json()['data']['id'])
        print(f"Created applicant: random_applicant{i}@example.com")
    else:
        print(f"Failed ({response.status_code}) for random_applicant{i}@example.com. Response text: {response.text}")



def create_user(role, email, password, first_name, last_name, major = "", school = "", resume_file = "", company_name = "", job_title = "", company_size = "", user_linkedin_url = ""):

    data = {
        "role": role,
        "email": email,
        "password": password,
        "major": major,
        "school": school,
        "first_name": first_name,
        "last_name": last_name
    }

    files = {}

    if role == "applicant":

        data.update({
            # todo; skills aren't implemented yet
            "skills": "",
            "portfolio_url": "https://portfolio.example.com",
        })

        if resume_file:
            with open(resume_file, "rb") as f:
                resume_file = SimpleUploadedFile(f.name, f.read(), content_type="application/pdf")

                files = {
                    "resume_file": resume_file
                }

    elif role == "employer":
        data.update({
            "company_name": company_name,
            "job_title": job_title,
            "company_size": company_size,
            "linkedin_url": user_linkedin_url,
        })

    response = requests.post(CREATE_ACCOUNT_URL, data=data, files=files)

    if response.status_code == 201:
        if role == "employer":
            employer_ids.append(response.json()["data"]["id"])
        else:
            employee_ids.append(response.json()['data']['id'])
        print(f"Created {role}: {email}")
    else:
        print(f"Failed ({response.status_code}) for {email}. Response text: {response.text}")


def generate_random_applications_and_likes():
    for i, employee in enumerate(employee_ids):
        print(f'{i + 1} / {len(employee_ids)}...')
        for job in job_ids:
            data = {
                "job_id": job
            }


            if random.randint(1, 10) <= 8:
                response = requests.patch(ADD_IMPRESSION_URL, data=data)
                if response.status_code != 200:
                        print(f"Failed ({response.status_code}) for adding impression. Response text: {response.text}")
                else:
                    global total_impressions
                    total_impressions += 1

            if random.randint(1, 4) == 1:
                
                params = {
                    "job_id": job,
                    "user_id": employee
                }

                response = requests.get(APPLY_TO_JOB_URL, params=params)

                if response.status_code != 200:
                    print(f"Failed ({response.status_code}) for applying. Response text: {response.text}")
                else:
                    global total_applications
                    total_applications += 1

            if random.randint(1, 5) == 1:
                data = {
                    "job_id": job,
                    "user_id": employee
                }

                response = requests.post(LIKE_JOB_URL, data=data)

                if response.status_code != 200:
                    print(f"Failed ({response.status_code}) for liking a job posting. Response text: {response.text}")
                else:
                    global total_likes
                    total_likes += 1


def main():
    for user in USERS:
        create_user(role = user.get("role"), email = user.get("email"), password = user.get("password"),
                    first_name = user.get("first_name"), last_name = user.get("last_name"),
                    major = user.get("major"), school = user.get("school"),
                    resume_file = user.get("resume_file"), company_name = user.get("company_name"),
                    job_title = user.get("job_title"), company_size = user.get("company_size"),
                    user_linkedin_url = user.get("user_linkedin_url", ""))
    
    for i in range(1, 26):
        create_random_applicant(i)
   
    # we need to fill this in after the users get created, as we need the IDs of employers
    JOB_POSTINGS = [
    {
        "media_items": [
            {
                "fileType": "jpg",
                "fileSize": "42055",
                "fileName": "conference-room-in-office-.jpg",
                "downloadLink": "https://firebasestorage.googleapis.com/v0/b/signed-b5147.firebasestorage.app/o/sample-media%2Fconference-room-in-office-.jpg?alt=media&token=4c540ece-bbd0-4365-80c8-1e102f24501b"
            },
            {
                "fileType": "jpg",
                "fileSize": "49219",
                "fileName": "desktop-computer-on-desk-in-office.jpg",
                "downloadLink": "https://firebasestorage.googleapis.com/v0/b/signed-b5147.firebasestorage.app/o/sample-media%2Fdesktop-computer-on-desk-in-office.jpg?alt=media&token=58a9b67c-9377-4e49-89a5-22356e05abfc"
            },
            {
                "fileType": "jpg",
                "fileSize": "40964",
                "fileName": "happy-office-worker-working-on-a-laptop-with-paper-notes.jpg",
                "downloadLink": "https://firebasestorage.googleapis.com/v0/b/signed-b5147.firebasestorage.app/o/sample-media%2Fhappy-office-worker-working-on-a-laptop-with-paper-notes.jpg?alt=media&token=a390aab8-3efe-4483-8b55-df86128dd4d8"
            },
        ],
        "company_logo" : None,
        "job_title": "Software Engineer",
        "company": "Google",
        "location": "CA",
        "job_type": "Full Time",
        "salary": "$125K",
        "company_size": "10000+",
        "tags": ["Java", "Full Stack", "React", "Python"],
        "job_description": "In this role, you are responsible in innovating new solutions to Google's suite of products. We are looking for recent graduates (or soon to be graduates) with degrees in computer science, computer engineering, or related disciplines. No prior work experience is required, but candiates with exprience working with Java, React and Python in industry or project settings is a plus.",
        "posted_by": employer_ids[0],
    },
    {
        "media_items": [
            {
                "fileType": "jpg",
                "fileSize": "45569",
                "fileName": "working-in-a-modern-office.jpg",
                "downloadLink": "https://firebasestorage.googleapis.com/v0/b/signed-b5147.firebasestorage.app/o/sample-media%2Fworking-in-a-modern-office.jpg?alt=media&token=b2cd3e65-4acf-428d-97ac-766586e12acb"
            },
        ],
        "company_logo" : None,
        "job_title": "Quality Assurance Tester",
        "company": "Google",
        "location": "CA",
        "job_type": "Full Time",
        "salary": "$85K",
        "company_size": "10000+",
        "tags": ["Testing", "QA"],
        "job_description": "In this role, you are responsible for ensuring the highest quality of new Google products and features before they roll out. Responsibilities include using test libraries and manual testing to test our suite of products. Familiarity with Python, Java, and React are recommended.",
        "posted_by": employer_ids[2],
    },
    {
        "media_items": [
            {
                "fileType": "jpg",
                "fileSize": "70510",
                "fileName": "office-interior-with-glass-windows-and-city-buildings.jpg",
                "downloadLink": "https://firebasestorage.googleapis.com/v0/b/signed-b5147.firebasestorage.app/o/sample-media%2Foffice-interior-with-glass-windows-and-city-buildings.jpg?alt=media&token=561a19c0-3e12-4560-a74d-601bbe02679d"
            },
        ],
        "company_logo" : None,
        "job_title": "Finance Analyst",
        "company": "Do it All Co.",
        "location": "Remote",
        "job_type": "Full Time",
        "salary": "$100K",
        "company_size": "100",
        "tags": ["Finance", "Statistics", "Analyst"],
        "job_description": "We are looking for finance analysts to join our team. Prior experience in the field of managing finaces is a plus. In this role, your main responsilibilty is to help maintain the company's finances, ensuring that expenses are within our budgets. Experience working with analysis tools such as Excel is required.",
        "posted_by": employer_ids[1],
    },
    {
        "media_items": [
            {
                "fileType": "jpg",
                "fileSize": "70510",
                "fileName": "office-interior-with-glass-windows-and-city-buildings.jpg",
                "downloadLink": "https://firebasestorage.googleapis.com/v0/b/signed-b5147.firebasestorage.app/o/sample-media%2Foffice-interior-with-glass-windows-and-city-buildings.jpg?alt=media&token=561a19c0-3e12-4560-a74d-601bbe02679d"
            },
        ],
        "company_logo" : None,
        "job_title": "Human Resources",
        "company": "Do it All Co.",
        "location": "Remote",
        "job_type": "Full Time",
        "salary": "$1M",
        "company_size": "100",
        "tags": ["Management", "Communication"],
        "job_description": "The HR Specialist will manage recruitment, onboarding, and employee relations to ensure a positive workplace culture. This role involves coordinating with department leaders to support staffing needs, performance management, and compliance with company policies.",
        "posted_by": employer_ids[1],
    },

    ] * 10

    for job_posting in JOB_POSTINGS:
        create_job_posting(media_items = job_posting.get("media_items"), company_logo = job_posting.get("job_posting"), 
                           job_title = job_posting.get("job_title"), company = job_posting.get("company"), 
                           location = job_posting.get("location"), job_type = job_posting.get("job_type"), 
                           salary = job_posting.get("salary"), company_size = job_posting.get("company_size"), 
                           tags = job_posting.get("tags"), job_description = job_posting.get("job_description"), 
                           posted_by = job_posting.get("posted_by"))
        



    print("Adding random applications and likes...")
    generate_random_applications_and_likes()
    print(f"Added {total_impressions} impressions")
    print(f"Added {total_applications} applications")
    print(f"Added {total_likes} likes")



if __name__ == "__main__":
    main()