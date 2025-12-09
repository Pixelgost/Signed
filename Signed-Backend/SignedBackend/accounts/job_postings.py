from django.db import transaction, models
from .models import MediaItem, JobPosting, EmployerProfile, ApplicantProfile, User, PersonalityType, JobLike, Notification
from .firebase_admin import db
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.http import HttpResponse
import json
import numpy as np
from sentence_transformers import SentenceTransformer
import csv
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.units import inch
from datetime import datetime

embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
learning_rate = 0.03

def cosine_similarity(vec1, vec2):
    # Convert to numpy arrays
    v1 = np.array(vec1)
    v2 = np.array(vec2)

    dot_product = np.dot(v1, v2)
    magnitude = np.linalg.norm(v1) * np.linalg.norm(v2)

    if magnitude == 0:
        return 0.0
    return dot_product / magnitude

def normalize_vector(vector):
    vector = np.array(vector)
    magnitude = np.linalg.norm(vector)
    vector = vector / magnitude
    return vector

def increase_similarity(original_vector, reference_vector):

    v1 = np.array(original_vector)
    v2 = np.array(reference_vector)
    v1_normal = normalize_vector(v1)
    v2_normal = normalize_vector(v2)
    new_vector = ((1 - learning_rate) * v1_normal) + (learning_rate * v2_normal)
    v3_normal = normalize_vector(new_vector)
    return v3_normal

def decrease_similarity(original_vector, reference_vector):
    v1 = np.array(original_vector)
    v2 = np.array(reference_vector)
    v1_normal = normalize_vector(v1)
    v2_normal = normalize_vector(v2)
    new_vector = v1_normal - (learning_rate * v2_normal)
    v3_normal = normalize_vector(new_vector)
    return v3_normal



def generate_job_embedding(job_title, job_description, tags, location, salary, company_size, job_type):
    """Generate vector embedding from job posting data"""
    try:
        # Combine all text fields into a single text
        text_parts = [
            f"Job Title: {job_title}",
            f"Description: {job_description or ''}",
            f"Location: {location}",
            f"Job Type: {job_type}",
            f"Salary: {salary or ''}",
            f"Company Size: {company_size or ''}",
            f"Tags: {', '.join(tags) if tags else ''}"
        ]
        combined_text = " ".join(text_parts)
        
        if combined_text.strip():
            vector_new = embedding_model.encode([combined_text])[0]
            # Normalize the vector to unit length
            norm = np.linalg.norm(vector_new)
            if norm > 0:
                return (vector_new / norm).tolist()
            else:
                return vector_new.tolist()
        return None
    except Exception as e:
        print(f"Error generating job embedding: {e}")
        return None

@api_view(['GET'])
def apply_to_job(request):
    job_id = request.query_params.get('job_id')
    user_id = request.query_params.get('user_id')
    
    try:
        # user = User.objects.get(id=user_id)
        applicant_profile = ApplicantProfile.objects.get(user__id = user_id)
        
        job_posting = JobPosting.objects.get(id=job_id)
        
        if not applicant_profile.vector_embedding:
            return Response({
                'status': 'error',
                'message': 'User does not have an embedding vector'
            }, status=400)
            
        if not job_posting.vector_embedding:
            return Response({
                'status': 'error',
                'message': 'Job posting does not have an embedding vector'
            }, status=400)
        
        user_embedding = np.array(applicant_profile.vector_embedding)
        job_embedding = np.array(job_posting.vector_embedding)
        
        new_embedding = increase_similarity(user_embedding, job_embedding)
        
        applicant_profile.vector_embedding = new_embedding.tolist()
        applicant_profile.save()

        job_posting.applicants.add(applicant_profile)

        db.collection("job_postings").document(str(job_id)).set(job_posting_to_dict(job_posting))
        
        return Response({
            'status': 'success',
            'message': 'Applied to job successfully',
        }, status=200)
        
    except User.DoesNotExist:
        return Response({
            'status': 'error',
            'message': 'User not found'
        }, status=404)
    except ApplicantProfile.DoesNotExist:
        return Response({
            'status': 'error',
            'message': 'Applicant profile not found'
        }, status=404)
    except JobPosting.DoesNotExist:
        return Response({
            'status': 'error',
            'message': 'Job posting not found'
        }, status=404)
    except Exception as e:
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=500)

@api_view(['GET'])
def reject_job(request):
    job_id = request.query_params.get('job_id')
    user_id = request.query_params.get('user_id')
    
    try:
        user = User.objects.get(id=user_id)
        applicant_profile = ApplicantProfile.objects.get(user=user)
        
        job_posting = JobPosting.objects.get(id=job_id)
        
        if not applicant_profile.vector_embedding:
            return Response({
                'status': 'error',
                'message': 'User does not have an embedding vector'
            }, status=400)
            
        if not job_posting.vector_embedding:
            return Response({
                'status': 'error',
                'message': 'Job posting does not have an embedding vector'
            }, status=400)
        
        user_embedding = np.array(applicant_profile.vector_embedding)
        job_embedding = np.array(job_posting.vector_embedding)
        
        new_embedding = decrease_similarity(user_embedding, job_embedding)
        
        applicant_profile.vector_embedding = new_embedding.tolist()
        applicant_profile.save()

        job_posting.num_rejects += 1
        job_posting.save()

        try:
            db.collection("job_postings").document(str(job_id)).update({"num_rejects": int(job_posting.num_rejects)})
        except Exception as e:
            return Response({'status': 'error', 'message': f'Firebase update failed'}, status=500)

        
        return Response({
            'status': 'success',
            'message': 'Rejected job successfully',
        }, status=200)
        
    except User.DoesNotExist:
        return Response({
            'status': 'error',
            'message': 'User not found'
        }, status=404)
    except ApplicantProfile.DoesNotExist:
        return Response({
            'status': 'error',
            'message': 'Applicant profile not found'
        }, status=404)
    except JobPosting.DoesNotExist:
        return Response({
            'status': 'error',
            'message': 'Job posting not found'
        }, status=404)
    except Exception as e:
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=500)

@api_view(['GET', 'PATCH'])
def get_job_postings(request):
    try:
        page = int(request.query_params.get('page', 1))
        page_size = 15
        # fetch_inactive = request.query_params.get('fetch_inactive', False)
        def _bool_qp(val, default=False) -> bool:
            if val is None:
                return default
            return str(val).strip().lower() in {"1", "true", "t", "yes", "y"}

        fetch_inactive = _bool_qp(request.query_params.get('fetch_inactive'), False)
        filters = request.query_params.get('filters', None)
        get_applicant_info = request.query_params.get('get_applicant_info', False)

        if filters:
            filters = json.loads(filters)

        # print(filters)       

        # PATCH request: update is_active
        if request.method == 'PATCH':
            if not filters or "id" not in filters:
                return Response({"error": "Job ID required in filters"}, status=400)
            job_id = filters["id"]
            is_active = request.data.get("is_active")
            if is_active is None:
                return Response({"error": "is_active field required"}, status=400)

            doc_ref = db.collection("job_postings").document(str(job_id))
            doc = doc_ref.get()
            if not doc.exists:
                return Response({"error": "Job not found"}, status=404)

            doc_ref.update({"is_active": is_active})
            return Response({"status": "success", "is_active": is_active})

        #Query Job Postings 
        job_postings_ref = db.collection("job_postings")
        job_postings_docs = job_postings_ref.stream()
        

        job_postings_list = []
        for doc in job_postings_docs:
            job_data = doc.to_dict()
            job_data['id'] = doc.id  # Add the document ID
            if job_data.get('is_active', True) or fetch_inactive:
                job_postings_list.append(job_data)


        # print(filters)
        # print(job_postings_list)
        if filters:
            filtered_jobs = []
            for job in job_postings_list:
                for key, value in filters.items():
                    if key in ["user_company", "user_id", "user_email"]:
                        if job["posted_by"][key] == value:
                            filtered_jobs.append(job)
                            break
                    # handle fields that do not exist
                    if key not in job:
                        continue
                    elif job[key] == value:
                        filtered_jobs.append(job)
                        break
            job_postings_list = filtered_jobs

        print(f"Found {len(job_postings_list)} job postings from Firebase")
        
        # Get user UUID from query params and their embedding for similarity sorting
        user_uid = request.query_params.get('user_uid')
        user = None
        if user_uid:
            try:
                # Get user by UUID
                user = User.objects.get(id=user_uid)
                
                # Get applicant profile for the user
                applicant_profile = ApplicantProfile.objects.filter(user=user).first()
                if applicant_profile and applicant_profile.vector_embedding:
                    user_embedding = np.array(applicant_profile.vector_embedding)
                    
                    # Calculate cosine similarity for each job posting
                    for job in job_postings_list:
                        if 'vector_embedding' in job and job['vector_embedding']:
                            job_embedding = np.array(job['vector_embedding'])
                            similarity = cosine_similarity(user_embedding, job_embedding)
                            job['similarity_score'] = similarity
                        else:
                            job['similarity_score'] = 0.0
                    
                    # Sort by similarity score (highest first)
                    job_postings_list = sorted(job_postings_list, key=lambda x: x.get('similarity_score', 0.0), reverse=True)
                    print(f"Sorted job postings by similarity to user {user.id}")
            except User.DoesNotExist:
                print(f"User with UUID {user_uid} not found")
                for job in job_postings_list:
                    job['similarity_score'] = 0.0
            except Exception as e:
                print(f"Error sorting by similarity: {e}")
                for job in job_postings_list:
                    job['similarity_score'] = 0.0
        else:
            # If no user_uid provided, add similarity_score of 0
            for job in job_postings_list:
                job['similarity_score'] = 0.0
        
        # add like status for each job posting if user is an applicant
        if user and user.role == 'applicant':
            # gets all job IDs that the user has liked
            liked_job_ids = set(
                JobLike.objects.filter(user=user).values_list('job_posting_id', flat=True)
            )


            # adds is_liked status + bookmark to each job posting
            try:
                applicant_profile = ApplicantProfile.objects.get(user=user)
                bookmarked_job_ids = set(
                    str(job_id) for job_id in applicant_profile.bookmarked_jobs.values_list('id', flat=True)
                )
            except ApplicantProfile.DoesNotExist:
                bookmarked_job_ids = set()

            # adds is_liked and is_bookmarked status to each job posting
            for job in job_postings_list:
                job['is_liked'] = job.get('id') in liked_job_ids
                job['is_bookmarked'] = job.get('id') in bookmarked_job_ids
        else:
            # if no user or not an applicant, set is_liked and is_bookmarked to false
            for job in job_postings_list:
                job['is_liked'] = False
                job['is_bookmarked'] = False

        # ensures likes_count is included (default to 0 if not present from Firebase)
        for job in job_postings_list:
            if 'likes_count' not in job:
                job['likes_count'] = 0


        # get applicant info if requested
        if get_applicant_info:
            unique_applicants = {}
            for job in job_postings_list:
                for applicant in job["applicants"]:
                    unique_applicants[applicant] = None

            for applicant in unique_applicants:
                try:
                    user = ApplicantProfile.objects.get(user__email = applicant)
                    unique_applicants[applicant] = {
                        "first_name": user.user.first_name or "",
                        "last_name": user.user.last_name or "",
                        "email": user.user.email or "",
                        "major" : user.major or "",
                        "school": user.school or "",
                        "skills": user.skills or [],
                        "personality_type": user.personality_type or "",
                        "resume_url": user.resume_file.url or "",
                        "portfolio_url": user.portfolio_url or "",
                        "profile_image": user.profile_image.url if user.profile_image else "",
                        "bio": user.bio or "",
                    }
                except ApplicantProfile.DoesNotExist:
                    return Response({"error": f"applicant {applicant} not found"}, status=404)
            
            
            for job in job_postings_list:
                job["applicants"] = [unique_applicants[applicant] for applicant in job["applicants"]]

        
        total_count = len(job_postings_list)
        total_pages = (total_count + page_size - 1) // page_size
        
        start_index = (page - 1) * page_size
        end_index = start_index + page_size
        paginated_job_postings = job_postings_list[start_index:end_index]        
        return Response({
            'job_postings': paginated_job_postings,
            'pagination': {
                'current_page': page,
                'total_pages': total_pages,
                'total_count': total_count,
                'has_next': page < total_pages,
            }
        }, status=200)
    except Exception as e:
        return Response({"Error": str(e)}, status=500)

@api_view(['GET'])
def get_applied_jobs(request):
    user_id = request.query_params.get('user_id')
    try:
        user = User.objects.get(id=user_id)
        applicant_profile = ApplicantProfile.objects.get(user=user)

        # Fetch all jobs where this applicant has applied
        applied_jobs = JobPosting.objects.filter(applicants=applicant_profile, is_active=True)

        # Convert to dictionary for response
        applied_jobs_list = [job_posting_to_dict(job) for job in applied_jobs]

        return Response({
            'status': 'success',
            'applied_job_postings': applied_jobs_list
        }, status=200)
    
    except User.DoesNotExist:
        return Response({'status': 'error', 'message': 'User not found'}, status=404)
    except ApplicantProfile.DoesNotExist:
        return Response({'status': 'error', 'message': 'Applicant profile not found'}, status=404)
    except Exception as e:
        return Response({'status': 'error', 'message': str(e)}, status=500)

@api_view(['POST'])
def create_job_posting(request):
    data = request.data

    # data[] throws an error if the field does not exist in the request.
    # data.get() returns null (or a specified default value) if the field does not exist in the request.
    # this enforces that job title, company, location, and job type are non-null.
    try:
        media_items = data.get("media_items", [])
        company_logo = data.get("company_logo")
        job_title = data["job_title"]
        company = data["company"]
        location = data["location"]
        job_type = data["job_type"]
        salary = data.get("salary")
        company_size = data.get("company_size")
        tags = data.get("tags", [])
        job_description = data.get("job_description")
        posted_by = data["posted_by"]
        personality_types = data.get("personality_preferences", [])
        is_edit = data.get("is_edit", False)
        edit_id = data.get("edit_id")

    except:
        return Response({"Error": "Invalid or missing body parameters"}, status=400)
    
    posted_by = EmployerProfile.objects.get(user__id=posted_by)

    if not posted_by:
        return Response({
            'Error': 'Cannot find associated employer object'
        }, status=500)
    
    media_arr = []
    for media in media_items:
        item = create_media_item(
            media["fileType"],
            media["fileSize"],
            media["fileName"],
            media["downloadLink"]
        )
        item.save() 
        media_arr.append(item)

    logo = None
    if company_logo:
        logo = create_media_item(
            company_logo["fileType"],
            company_logo["fileSize"],
            company_logo["fileName"],
            company_logo["downloadLink"]
        )
        logo.save()

    if is_edit:
        try: 
            posting = JobPosting.objects.get(id=edit_id)
            posting.company_logo = logo
            posting.job_title = job_title
            posting.company = company
            posting.location = location
            posting.job_type = job_type
            posting.salary = salary
            posting.company_size = company_size
            posting.tags = tags
            posting.job_description = job_description

            if personality_types is not None:
                posting.personality_preferences.set(
                    PersonalityType.objects.filter(types__in=personality_types)
                )

            # Regenerate embedding for updated job posting
            embedding = generate_job_embedding(job_title=job_title, job_description=job_description, tags=tags, location=location, salary=salary, company_size=company_size, job_type=job_type)
            posting.vector_embedding = embedding
            # posting.posted_by = posted_by
            posting.media_items.set(media_arr)
            posting.save()

            db.collection("job_postings").document(str(posting.id)).set(job_posting_to_dict(posting), merge=True)
        except:
            return Response({"Error": "Error while editing job posting"}, status=500)
        
        return Response({
            'status': 'success',
            'posting id': posting.id 
        }, status=200)

    embedding = generate_job_embedding(job_title=job_title, job_description=job_description, tags=tags, location=location, salary=salary, company_size=company_size, job_type=job_type)
    posting = JobPosting(
        company_logo=logo,
        job_title=job_title,
        company=company,
        location=location,
        job_type=job_type,
        salary=salary,
        company_size=company_size,
        tags=tags,
        job_description=job_description,
        posted_by = posted_by,
        vector_embedding=embedding,
    )
    posting.save()

    if personality_types:
        posting.personality_preferences.set(
            PersonalityType.objects.filter(types=personality_types)
        )

    posting.media_items.set(media_arr)

    db.collection("job_postings").document(str(posting.id)).set(job_posting_to_dict(posting))

    try:
        notify_similar_applicants(posting)
    except Exception as e:
        print(f"Error notifying similar applicants: {e}")

    try:
        notify_similar_applicants(posting)
    except Exception as e:
        print(f"Error notifying similar applicants: {e}")

    return Response({
        'status': 'success',
        'posting id': posting.id 
    }, status=200)


def create_media_item(file_type, file_size, file_name, download_link):
    mediaItem = MediaItem(
        file_type = file_type,
        file_size = file_size,
        file_name = file_name,
        download_link = download_link
    )

    return mediaItem


def find_similar_applicants(job_posting, similarity_threshold=0.35, max_notifications=50):
    """
    Find applicants with similar vector embeddings to a job posting.
    
    Args:
        job_posting: JobPosting instance with vector_embedding
        similarity_threshold: Minimum cosine similarity score (0-1)
        max_notifications: Maximum number of notifications to create
    
    Returns:
        List of ApplicantProfile instances that match the criteria
    """
    if not job_posting.vector_embedding:
        return []
    
    job_embedding = np.array(job_posting.vector_embedding)
    
    applicants = ApplicantProfile.objects.filter(
        vector_embedding__isnull=False,
        notifications_enabled=True,
        user__role='applicant'
    ).exclude(
        vector_embedding=[]
    ).select_related('user')
    
    similar_applicants = []
    
    for applicant in applicants:
        if not applicant.vector_embedding:
            continue
            
        try:
            applicant_embedding = np.array(applicant.vector_embedding)
            similarity = cosine_similarity(job_embedding, applicant_embedding)
            
            if similarity >= similarity_threshold:
                similar_applicants.append((applicant, similarity))
        except Exception as e:
            print(f"Error calculating similarity for applicant {applicant.user.id}: {e}")
            continue
    
    similar_applicants.sort(key=lambda x: x[1], reverse=True)
    return [app[0] for app in similar_applicants[:max_notifications]]


def notify_similar_applicants(job_posting):
    """
    Create notifications for applicants who might be interested in a job posting.
    
    Args:
        job_posting: JobPosting instance
    """
    try:
        if not job_posting.is_active:
            return 0
            
        employer_user_id = None
        if job_posting.posted_by and job_posting.posted_by.user:
            employer_user_id = job_posting.posted_by.user.id
        
        similar_applicants = find_similar_applicants(job_posting, similarity_threshold=0.35, max_notifications=50)
        
        notifications_created = 0
        for applicant in similar_applicants:
            if employer_user_id and applicant.user.id == employer_user_id:
                continue
                
            existing_notification = Notification.objects.filter(
                user=applicant.user,
                job_posting=job_posting,
                read=False
            ).exists()
            
            if existing_notification:
                continue
            
            try:
                Notification.objects.create(
                    user=applicant.user,
                    title=f"New Job Match: {job_posting.job_title}",
                    message=f"A new {job_posting.job_title} position at {job_posting.company} might be a good fit for you!",
                    notification_type='success',
                    job_posting=job_posting,
                    read=False
                )
                notifications_created += 1
            except Exception as e:
                print(f"Error creating notification for applicant {applicant.user.id}: {e}")
                continue
        
        print(f"Created {notifications_created} notifications for job posting {job_posting.id}")
        return notifications_created
    except Exception as e:
        print(f"Error in notify_similar_applicants: {e}")
        return 0


def find_similar_applicants(job_posting, similarity_threshold=0.35, max_notifications=50):
    """
    Find applicants with similar vector embeddings to a job posting.
    
    Args:
        job_posting: JobPosting instance with vector_embedding
        similarity_threshold: Minimum cosine similarity score (0-1)
        max_notifications: Maximum number of notifications to create
    
    Returns:
        List of ApplicantProfile instances that match the criteria
    """
    if not job_posting.vector_embedding:
        return []
    
    job_embedding = np.array(job_posting.vector_embedding)
    
    applicants = ApplicantProfile.objects.filter(
        vector_embedding__isnull=False,
        notifications_enabled=True,
        user__role='applicant'
    ).exclude(
        vector_embedding=[]
    ).select_related('user')
    
    similar_applicants = []
    
    for applicant in applicants:
        if not applicant.vector_embedding:
            continue
            
        try:
            applicant_embedding = np.array(applicant.vector_embedding)
            similarity = cosine_similarity(job_embedding, applicant_embedding)
            
            if similarity >= similarity_threshold:
                similar_applicants.append((applicant, similarity))
        except Exception as e:
            print(f"Error calculating similarity for applicant {applicant.user.id}: {e}")
            continue
    
    similar_applicants.sort(key=lambda x: x[1], reverse=True)
    return [app[0] for app in similar_applicants[:max_notifications]]


def notify_similar_applicants(job_posting):
    """
    Create notifications for applicants who might be interested in a job posting.
    
    Args:
        job_posting: JobPosting instance
    """
    try:
        if not job_posting.is_active:
            return 0
            
        employer_user_id = None
        if job_posting.posted_by and job_posting.posted_by.user:
            employer_user_id = job_posting.posted_by.user.id
        
        similar_applicants = find_similar_applicants(job_posting, similarity_threshold=0.35, max_notifications=50)
        
        notifications_created = 0
        for applicant in similar_applicants:
            if employer_user_id and applicant.user.id == employer_user_id:
                continue
                
            existing_notification = Notification.objects.filter(
                user=applicant.user,
                job_posting=job_posting,
                read=False
            ).exists()
            
            if existing_notification:
                continue
            
            try:
                Notification.objects.create(
                    user=applicant.user,
                    title=f"New Job Match: {job_posting.job_title}",
                    message=f"A new {job_posting.job_title} position at {job_posting.company} might be a good fit for you!",
                    notification_type='success',
                    job_posting=job_posting,
                    read=False
                )
                notifications_created += 1
            except Exception as e:
                print(f"Error creating notification for applicant {applicant.user.id}: {e}")
                continue
        
        print(f"Created {notifications_created} notifications for job posting {job_posting.id}")
        return notifications_created
    except Exception as e:
        print(f"Error in notify_similar_applicants: {e}")
        return 0


def job_posting_to_dict(posting):
    return {
        "id": str(posting.id),
        "job_title": posting.job_title,
        "company": posting.company,
        "location": posting.location,
        "job_type": posting.job_type,
        "salary": posting.salary,
        "company_size": (
            posting.posted_by.company.size
            if (posting.posted_by and posting.posted_by.company)
            else posting.company_size
        ),
        "tags": posting.tags,
        "job_description": posting.job_description,
        "company_logo": {
            "file_name": posting.company_logo.file_name,
            "file_type": posting.company_logo.file_type,
            "file_size": posting.company_logo.file_size,
            "download_link": posting.company_logo.download_link,
        } if posting.company_logo else None,
        "media_items": [
            {
                "file_name": item.file_name,
                "file_type": item.file_type,
                "file_size": item.file_size,
                "download_link": item.download_link,
            } for item in posting.media_items.all()
        ],
        "date_posted": posting.date_posted.isoformat(),
        "date_updated": posting.date_updated.isoformat(),
        "posted_by": {
            "user_id": str(posting.posted_by.user.id),
            "user_company_id": (
                str(posting.posted_by.company.id)
                if (posting.posted_by and posting.posted_by.company)
                else None
            ),
            "user_company": posting.posted_by.company.name if posting.posted_by and posting.posted_by.company else None,
            "user_email": posting.posted_by.user.email if posting.posted_by else None,
            "user_linkedin_url": posting.posted_by.linkedin_url if posting.posted_by else None
        } if posting.posted_by else None,
        "is_active": posting.is_active,
        "vector_embedding": posting.vector_embedding,
        "applicants": [str(user.user.email) for user in posting.applicants.all()],
        "personality_preferences": list(posting.personality_preferences.values_list("types", flat=True)),
        "likes_count": posting.likes_count,
        "impressions": posting.impressions,
        "num_rejects": posting.num_rejects,
        "num_applicants": len(posting.applicants.all())
    }


@api_view(['POST'])
def like_job_posting(request):
    """
    Toggle like for a job posting.
    Body: { "job_id": "<uuid>", "user_id": "<uuid>" }
    Only applicants can like.
    """
    job_id = request.data.get('job_id')
    user_id = request.data.get('user_id')

    if not job_id or not user_id:
        return Response({'status': 'error', 'message': 'job_id and user_id required'}, status=400)

    try:
        user = User.objects.get(id=user_id)
        if user.role != 'applicant':
            return Response({'status': 'error', 'message': 'Only applicants can like job postings'}, status=403)

        with transaction.atomic():
            job_posting = JobPosting.objects.select_for_update().get(id=job_id)

            like, created = JobLike.objects.get_or_create(user=user, job_posting=job_posting)
            if created:
                job_posting.likes_count = models.F('likes_count') + 1
                liked = True
            else:
                like.delete()
                job_posting.likes_count = models.F('likes_count') - 1
                liked = False

            job_posting.save(update_fields=["likes_count"])
            job_posting.refresh_from_db(fields=["likes_count"])

        # Mirror to Firebase (best-effort)
        try:
            db.collection("job_postings").document(str(job_id)).update({"likes_count": int(job_posting.likes_count)})
        except Exception as e:
            print(f"[warn] Firebase mirror failed: {e}")

        return Response({
            'status': 'success',
            'liked': liked,
            'likes_count': int(job_posting.likes_count)
        }, status=200)

    except User.DoesNotExist:
        return Response({'status': 'error', 'message': 'User not found'}, status=404)
    except JobPosting.DoesNotExist:
        return Response({'status': 'error', 'message': 'Job posting not found'}, status=404)
    except Exception as e:
        return Response({'status': 'error', 'message': str(e)}, status=500)
    
'''
Adds an impression to a job posting
'''
@api_view(['PATCH'])
def add_impression(request):
    job_id = request.data.get('job_id')

    if not job_id:
        return Response({'status': 'error', 'message': 'job_id required'}, status=400)
    
    try:
        job = JobPosting.objects.get(id=job_id)

        job.impressions += 1

        job.save()

    except JobPosting.DoesNotExist:
        return Response({'status': 'error', 'message': 'Job posting not found'}, status=404)
    
    try:
        db.collection("job_postings").document(str(job_id)).update({"impressions": int(job.impressions)})
    except Exception as e:
        return Response({'status': 'error', 'message': f'Firebase update failed'}, status=500)

    return Response({'status': 'success', 'message': f'Impression count updated to {job.impressions}'}, status=200)


@api_view(['GET'])
def export_metrics_csv(request):
    user_id = request.GET.get('user_id')

    if not user_id:
        return Response({'status': 'error', 'message': 'user_id required'}, status=400)

    try:
        user = User.objects.get(id=user_id)
        employer_profile = EmployerProfile.objects.get(user=user)
    except (User.DoesNotExist, EmployerProfile.DoesNotExist):
        return Response({'status': 'error', 'message': 'Employer not found'}, status=404)

    jobs = JobPosting.objects.filter(posted_by=employer_profile)

    if not jobs.exists():
        return Response({'status': 'error', 'message': 'No job postings found'}, status=404)

    # calc aggregate metrics
    total_impressions = sum(job.impressions for job in jobs)
    total_likes = sum(job.likes_count for job in jobs)
    total_applicants = sum(job.applicants.count() for job in jobs)
    active_count = jobs.filter(is_active=True).count()

    # collect all applicants
    unique_applicants = {}
    for job in jobs:
        for applicant in job.applicants.all():
            if applicant.id not in unique_applicants:
                unique_applicants[applicant.id] = {
                    'major': applicant.major,
                    'school': applicant.school,
                    'personality_type': applicant.personality_type
                }

    num_unique_applicants = len(unique_applicants)

    # aggregate characteristics
    major_count = {}
    school_count = {}
    personality_count = {}

    for stats in unique_applicants.values():
        if stats['major']:
            major_count[stats['major']] = major_count.get(stats['major'], 0) + 1
        if stats['school']:
            school_count[stats['school']] = school_count.get(stats['school'], 0) + 1
        if stats['personality_type']:
            personality_count[stats['personality_type']] = personality_count.get(stats['personality_type'], 0) + 1

    most_common_majors = sorted(major_count.items(), key=lambda x: x[1], reverse=True)[:5]
    most_common_schools = sorted(school_count.items(), key=lambda x: x[1], reverse=True)[:5]
    most_common_personalities = sorted(personality_count.items(), key=lambda x: x[1], reverse=True)[:5]

    # creating CSV here
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="metrics_export_{employer_profile.company.name.replace(" ", "_")}.csv"'

    writer = csv.writer(response)

    # section 1: summary metrics
    writer.writerow(['METRICS SUMMARY'])
    writer.writerow(['Metric', 'Value'])
    writer.writerow(['Total Impressions', total_impressions])
    writer.writerow(['Total Likes', total_likes])
    writer.writerow(['Total Applicants', total_applicants])
    writer.writerow(['Active Jobs', active_count])
    writer.writerow(['Unique Applicants', num_unique_applicants])
    writer.writerow([])

    # section 2: applicant characteristics
    writer.writerow(['APPLICANT CHARACTERISTICS'])
    writer.writerow([])

    writer.writerow(['Most Common Majors'])
    writer.writerow(['Major', 'Count'])
    for major, count in most_common_majors:
        writer.writerow([major, count])
    writer.writerow([])

    writer.writerow(['Most Common Schools'])
    writer.writerow(['School', 'Count'])
    for school, count in most_common_schools:
        writer.writerow([school, count])
    writer.writerow([])

    writer.writerow(['Most Common Personality Types'])
    writer.writerow(['Personality Type', 'Count'])
    for personality, count in most_common_personalities:
        writer.writerow([personality, count])
    writer.writerow([])

    # section 3: per-job metrics
    writer.writerow(['JOB POSTINGS DETAIL'])
    writer.writerow(['Job Title', 'Company', 'Location', 'Status', 'Impressions', 'Applicants', 'Likes'])

    for job in jobs:
        writer.writerow([
            job.job_title,
            job.company,
            job.location,
            'Active' if job.is_active else 'Inactive',
            job.impressions,
            job.applicants.count(),
            job.likes_count
        ])

    return response


@api_view(['GET'])
def export_metrics_pdf(request):
    user_id = request.GET.get('user_id')

    if not user_id:
        return Response({'status': 'error', 'message': 'user_id required'}, status=400)

    try:
        user = User.objects.get(id=user_id)
        employer_profile = EmployerProfile.objects.get(user=user)
    except (User.DoesNotExist, EmployerProfile.DoesNotExist):
        return Response({'status': 'error', 'message': 'Employer not found'}, status=404)

    jobs = JobPosting.objects.filter(posted_by=employer_profile)

    if not jobs.exists():
        return Response({'status': 'error', 'message': 'No job postings found'}, status=404)

    # calc aggregate metrics
    total_impressions = sum(job.impressions for job in jobs)
    total_likes = sum(job.likes_count for job in jobs)
    total_applicants = sum(job.applicants.count() for job in jobs)
    active_count = jobs.filter(is_active=True).count()

    # get all applicants
    unique_applicants = {}
    for job in jobs:
        for applicant in job.applicants.all():
            if applicant.id not in unique_applicants:
                unique_applicants[applicant.id] = {
                    'major': applicant.major,
                    'school': applicant.school,
                    'personality_type': applicant.personality_type
                }

    num_unique_applicants = len(unique_applicants)

    #aggregate characteristics
    major_count = {}
    school_count = {}
    personality_count = {}

    for stats in unique_applicants.values():
        if stats['major']:
            major_count[stats['major']] = major_count.get(stats['major'], 0) + 1
        if stats['school']:
            school_count[stats['school']] = school_count.get(stats['school'], 0) + 1
        if stats['personality_type']:
            personality_count[stats['personality_type']] = personality_count.get(stats['personality_type'], 0) + 1

    most_common_majors = sorted(major_count.items(), key=lambda x: x[1], reverse=True)[:5]
    most_common_schools = sorted(school_count.items(), key=lambda x: x[1], reverse=True)[:5]
    most_common_personalities = sorted(personality_count.items(), key=lambda x: x[1], reverse=True)[:5]

    # creating PDF 
    response = HttpResponse(content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="metrics_export_{employer_profile.company.name.replace(" ", "_")}.pdf"'

    # create PDF doc
    doc = SimpleDocTemplate(response, pagesize=letter)
    elements = []
    styles = getSampleStyleSheet()

    # title
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#1f2937'),
        spaceAfter=30,
        alignment=1
    )
    title = Paragraph(f"Metrics Report - {employer_profile.company.name}", title_style)
    elements.append(title)

    # date
    date_style = ParagraphStyle(
        'DateStyle',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#6b7280'),
        alignment=1
    )
    date_text = Paragraph(f"Generated on {datetime.now().strftime('%B %d, %Y')}", date_style)
    elements.append(date_text)
    elements.append(Spacer(1, 0.3*inch))

    # summary metrics section
    heading_style = ParagraphStyle(
        'Heading',
        parent=styles['Heading2'],
        fontSize=16,
        textColor=colors.HexColor('#1f2937'),
        spaceAfter=12
    )
    elements.append(Paragraph("Summary Metrics", heading_style))

    summary_data = [
        ['Metric', 'Value'],
        ['Total Impressions', str(total_impressions)],
        ['Total Likes', str(total_likes)],
        ['Total Applicants', str(total_applicants)],
        ['Active Jobs', str(active_count)],
        ['Unique Applicants', str(num_unique_applicants)]
    ]

    summary_table = Table(summary_data, colWidths=[3*inch, 2*inch])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3b82f6')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 0.4*inch))

    # applicant characteristics section
    elements.append(Paragraph("Applicant Characteristics", heading_style))

    # most common majors
    elements.append(Paragraph("Most Common Majors", styles['Heading3']))
    if most_common_majors:
        majors_data = [['Major', 'Count']]
        for major, count in most_common_majors:
            majors_data.append([major, str(count)])

        majors_table = Table(majors_data, colWidths=[3*inch, 2*inch])
        majors_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#10b981')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
            ('BACKGROUND', (0, 1), (-1, -1), colors.lightgrey),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ]))
        elements.append(majors_table)
    elements.append(Spacer(1, 0.2*inch))

    # most common schools
    elements.append(Paragraph("Most Common Schools", styles['Heading3']))
    if most_common_schools:
        schools_data = [['School', 'Count']]
        for school, count in most_common_schools:
            schools_data.append([school, str(count)])

        schools_table = Table(schools_data, colWidths=[3*inch, 2*inch])
        schools_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#10b981')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
            ('BACKGROUND', (0, 1), (-1, -1), colors.lightgrey),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ]))
        elements.append(schools_table)
    elements.append(Spacer(1, 0.2*inch))

    # most common personality types
    elements.append(Paragraph("Most Common Personality Types", styles['Heading3']))
    if most_common_personalities:
        personality_data = [['Personality Type', 'Count']]
        for personality, count in most_common_personalities:
            personality_data.append([personality, str(count)])

        personality_table = Table(personality_data, colWidths=[3*inch, 2*inch])
        personality_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#10b981')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
            ('BACKGROUND', (0, 1), (-1, -1), colors.lightgrey),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ]))
        elements.append(personality_table)
    elements.append(Spacer(1, 0.4*inch))

    # job postings detail section
    elements.append(Paragraph("Job Postings Detail", heading_style))

    jobs_data = [['Job Title', 'Location', 'Status', 'Impressions', 'Applicants', 'Likes']]
    for job in jobs:
        jobs_data.append([
            job.job_title,
            job.location,
            'Active' if job.is_active else 'Inactive',
            str(job.impressions),
            str(job.applicants.count()),
            str(job.likes_count)
        ])

    jobs_table = Table(jobs_data, colWidths=[1.8*inch, 1.2*inch, 0.8*inch, 0.9*inch, 0.9*inch, 0.7*inch])
    jobs_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f59e0b')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
        ('BACKGROUND', (0, 1), (-1, -1), colors.lightgrey),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
    ]))
    elements.append(jobs_table)

    # build PDF
    doc.build(elements)

    return response