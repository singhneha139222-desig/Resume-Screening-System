"""
db.py
-----
Handles MongoDB connection and operations for the Resume Screening System.
"""

from pymongo import MongoClient
import os
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables (mostly for local development; Space handles via secrets)
load_dotenv()

# Initialize MongoDB Connection
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
client = MongoClient(MONGO_URI)

# Database Name
db = client.get_database("resume_screener")

# Collections
users_collection = db.get_collection("users")
jobs_collection = db.get_collection("jobs")
candidates_collection = db.get_collection("candidates")

# ── User Operations ──

def create_user(username, email, password, role="recruiter"):
    if users_collection.find_one({"email": email}):
        return False, "Email already exists"
    
    hashed_password = generate_password_hash(password)
    user_data = {
        "username": username,
        "email": email,
        "password": hashed_password,
        "role": role,
        "created_at": datetime.utcnow()
    }
    users_collection.insert_one(user_data)
    return True, "User created successfully"

def authenticate_user(email, password):
    user = users_collection.find_one({"email": email})
    if user and check_password_hash(user["password"], password):
        # Don't return the password hash in the user object
        user['_id'] = str(user['_id'])
        del user['password']
        return user
    return None

# ── Candidate Operations ──

def insert_candidate(candidate_data):
    """
    Candidate data should include name, filename, text, skills, match_score, etc.
    """
    candidate_data["created_at"] = datetime.utcnow()
    result = candidates_collection.insert_one(candidate_data)
    return str(result.inserted_id)

def get_all_candidates():
    candidates = list(candidates_collection.find().sort("match_score", -1))
    for c in candidates:
        c['_id'] = str(c['_id'])
    return candidates

def get_candidate_by_id(candidate_id):
    from bson.objectid import ObjectId
    try:
        candidate = candidates_collection.find_one({"_id": ObjectId(candidate_id)})
        if candidate:
            candidate['_id'] = str(candidate['_id'])
        return candidate
    except Exception:
        return None

def update_candidate_audio(candidate_name, audio_text, language, audio_url=None):
    """Update latest candidate by name if audio is added."""
    candidates_collection.update_one(
        {"name": candidate_name},
        {"$set": {"audio_transcription": {"text": audio_text, "language": language, "error": None, "audio_url": audio_url}}}
    )

def update_candidate_audio_error(candidate_name, error_msg):
    """Update candidate with audio transcription error."""
    candidates_collection.update_one(
        {"name": candidate_name},
        {"$set": {"audio_transcription": {"text": "", "language": "", "error": error_msg}}}
    )

def clear_all_candidates():
    candidates_collection.delete_many({})
 