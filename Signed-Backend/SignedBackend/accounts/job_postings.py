from .models import MediaItem, JobPosting, EmployerProfile
from .firebase_admin import db
from rest_framework.decorators import api_view
from rest_framework.response import Response
import json
import numpy as np
from sentence_transformers import SentenceTransformer

embedding_model = SentenceTransformer("all-MiniLM-L6-v2")

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

@api_view(['GET', 'PATCH'])
def get_job_postings(request):
    try:
        page = int(request.query_params.get('page', 1))
        page_size = 15

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
            job_postings_list.append(job_data)


        print(filters)
        print(job_postings_list)
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
        

        #Pagination
        total_count = len(job_postings_list)
        total_pages = (total_count + page_size - 1) // page_size  # Ceiling division
        
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
        vector_embedding=embedding
    )
    posting.save()

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
        "company_size": posting.company_size,
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
            "user_company": posting.posted_by.company_name,
            "user_email":posting.posted_by.user.email
        },
        "is_active": posting.is_active,
    }

