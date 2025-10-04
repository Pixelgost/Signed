import firebase_admin
from firebase_admin import credentials, firestore, storage, auth
import os
from django.conf import settings

cred_path = os.path.join(settings.BASE_DIR, "SignedBackend", "signed-b5147-firebase-adminsdk-fbsvc-ff8d6f07a3.json")

if not firebase_admin._apps:
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)


db = firestore.client()           
firebase_auth = auth        
