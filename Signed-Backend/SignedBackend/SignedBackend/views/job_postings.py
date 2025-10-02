from ..models import MediaItem, JobPosting
from ..firebase_admin import db
from rest_framework.decorators import api_view
from rest_framework.response import Response

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
    except:
        return Response({"Error": "Invalid or missing body parameters"}, status=400)
    

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
        "is_active": posting.is_active,
    }
