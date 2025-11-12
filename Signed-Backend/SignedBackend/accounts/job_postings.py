from django.db import transaction, models
from .models import MediaItem, JobPosting, EmployerProfile, ApplicantProfile, User, PersonalityType, JobLike
from .firebase_admin import db
from rest_framework.decorators import api_view
from rest_framework.response import Response
import json
import numpy as np
from sentence_transformers import SentenceTransformer

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
        fetch_inactive = request.query_params.get('fetch_inactive', False)
        filters = request.query_params.get('filters', None)

        if filters:
            filters = json.loads(filters)

        print(filters)       

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

    print(data)

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


def job_posting_to_dict(posting):
    return {
        "id": str(posting.id),
        "job_title": posting.job_title,
        "company": posting.company,
        "location": posting.location,
        "job_type": posting.job_type,
        "salary": posting.salary,
        "company_size": posting.posted_by.company.size,
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