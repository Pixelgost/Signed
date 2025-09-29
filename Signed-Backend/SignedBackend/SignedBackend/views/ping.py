from django.http import JsonResponse
from django.utils import timezone


def ping(request):
    """
    API endpoint that returns the current timestamp.
    """
    current_time = timezone.now()
    
    return JsonResponse({
        'timestamp': current_time.isoformat(),
        'status': 'success'
    })

