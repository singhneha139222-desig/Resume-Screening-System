"""
app.py
------
Main Flask application for the Resume Screening System.
Includes MongoDB, Auth, Async Processing, and Sentence Transformers.
"""

import os
import concurrent.futures
from functools import wraps
from flask import Flask, render_template, request, redirect, url_for, flash, session
from dotenv import load_dotenv
import cloudinary
import cloudinary.uploader
import cloudinary.api

# Load environment variables
load_dotenv()

# Cloudinary Configuration
cloudinary.config(
    cloud_name = os.getenv('CLOUDINARY_CLOUD_NAME'),
    api_key = os.getenv('CLOUDINARY_API_KEY'),
    api_secret = os.getenv('CLOUDINARY_API_SECRET'),
    secure = True
)

from db import (
    create_user, authenticate_user, insert_candidate, 
    get_all_candidates, get_candidate_by_id, update_candidate_audio, 
    update_candidate_audio_error, clear_all_candidates
)
from werkzeug.utils import secure_filename
from resume_parser import extract_text, clean_text
from skill_extractor import extract_all, SKILLS_LIST
from job_matcher import calculate_match_score, find_skill_gaps, rank_candidates
from audio_transcriber import transcribe_audio

app = Flask(__name__)
# Fetch secret key from environment, with a default fallback for local dev
app.secret_key = os.getenv("SECRET_KEY", "premium-resume-screening-secret-key-default")

# Optional: Initialize Google Generative AI if key is present
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if GOOGLE_API_KEY:
    import google.generativeai as genai
    genai.configure(api_key=GOOGLE_API_KEY)

UPLOAD_FOLDER_RESUMES = os.path.join("uploads", "resumes")
UPLOAD_FOLDER_AUDIO = os.path.join("uploads", "audio")
os.makedirs(UPLOAD_FOLDER_RESUMES, exist_ok=True)
os.makedirs(UPLOAD_FOLDER_AUDIO, exist_ok=True)

ALLOWED_RESUME_EXTENSIONS = {"pdf", "docx"}
ALLOWED_AUDIO_EXTENSIONS = {"mp3", "wav", "m4a", "flac", "ogg", "webm"}

# Thread pool for async audio transcription
executor = concurrent.futures.ThreadPoolExecutor(max_workers=2)

def allowed_file(filename, allowed_extensions):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in allowed_extensions

# ── Authentication Helper ──
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if "user_id" not in session:
            flash("Please log in to access this page.", "warning")
            return redirect(url_for("login"))
        return f(*args, **kwargs)
    return decorated_function

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        email = request.form.get("email")
        password = request.form.get("password")
        user = authenticate_user(email, password)
        if user:
            session["user_id"] = user["_id"]
            session["username"] = user["username"]
            session["role"] = user["role"]
            flash("Logged in successfully!", "success")
            return redirect(url_for("index"))
        else:
            flash("Invalid email or password", "error")
    return render_template("login.html")

@app.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        username = request.form.get("username")
        email = request.form.get("email")
        password = request.form.get("password")
        success, msg = create_user(username, email, password)
        if success:
            flash("Registration successful. Please login.", "success")
            return redirect(url_for("login"))
        else:
            flash(msg, "error")
    return render_template("register.html")

@app.route("/logout")
def logout():
    session.clear()
    flash("Logged out successfully.", "info")
    return redirect(url_for("login"))

@app.route("/")
@login_required
def index():
    candidates = get_all_candidates()
    return render_template("index.html", candidate_count=len(candidates))

@app.route("/upload", methods=["POST"])
@login_required
def upload_resume():
    if "resume" not in request.files:
        flash("No file selected.", "error")
        return redirect(url_for("index"))

    file = request.files["resume"]
    if file.filename == "":
        flash("No file selected.", "error")
        return redirect(url_for("index"))

    if not allowed_file(file.filename, ALLOWED_RESUME_EXTENSIONS):
        flash("Invalid file type.", "error")
        return redirect(url_for("index"))

    filename = secure_filename(file.filename)
    if not filename:
        filename = "resume_file"
    filepath = os.path.join(UPLOAD_FOLDER_RESUMES, filename)
    file.save(filepath)

    raw_text = extract_text(filepath)
    if not raw_text.strip():
        flash("Could not extract text. Please ensure the PDF/DOCX is not just scanned images.", "error")
        return redirect(url_for("index"))

    cleaned_text = clean_text(raw_text)
    extracted_info = extract_all(cleaned_text)

    job_description = request.form.get("job_description", "").strip()
    match_score = 0.0
    skill_gaps = {"matched": [], "missing": []}
    jd_skills = []

    if job_description:
        from skill_extractor import extract_skills
        jd_skills = extract_skills(job_description)
        match_score = calculate_match_score(cleaned_text, job_description, extracted_info["skills"], jd_skills)
        skill_gaps = find_skill_gaps(extracted_info["skills"], job_description, SKILLS_LIST, jd_skills)

    # --- Cloudinary Upload Resume ---
    try:
        cloudinary_response = cloudinary.uploader.upload(filepath, resource_type="auto")
        resume_url = cloudinary_response.get("secure_url", "")
    except Exception as e:
        print(f"Cloudinary upload failed: {e}")
        resume_url = ""

    # Clean up local file after processing
    try:
        os.remove(filepath)
    except Exception:
        pass

    candidate_name = os.path.splitext(filename)[0]
    candidate_data = {
        "name": candidate_name,
        "filename": filename,
        "resume_url": resume_url,
        "resume_text": cleaned_text,
        "raw_text_preview": raw_text[:300],
        "skills": extracted_info["skills"],
        "education": extracted_info["education"],
        "experience": extracted_info["experience"],
        "match_score": match_score,
        "skill_gaps": skill_gaps,
        "job_description": job_description,
        "audio_transcription": None,
        "uploaded_by": session["user_id"]
    }
    
    # Save to MongoDB
    candidate_id = insert_candidate(candidate_data)
    session["last_candidate_id"] = str(candidate_id)

    flash("Resume analyzed successfully!", "success")
    return redirect(url_for("results"))

# Background transcribed processing
def process_audio(filepath, candidate_name):
    print(f"Beginning async transcription for {candidate_name}...")
    result = transcribe_audio(filepath)
    
    # Cloudinary Upload Audio
    audio_url = ""
    try:
        cloudinary_response = cloudinary.uploader.upload(filepath, resource_type="video") # 'video' covers audio for Cloudinary
        audio_url = cloudinary_response.get("secure_url", "")
    except Exception as e:
        print(f"Cloudinary audio upload failed: {e}")
    
    # Clean up local audio file
    try:
        os.remove(filepath)
    except Exception:
        pass

    if result["success"]:
        update_candidate_audio(candidate_name, result["text"], result["language"], audio_url)
        print(f"Transcription for {candidate_name} complete and saved to DB.")
    else:
        update_candidate_audio_error(candidate_name, result["error"])
        print(f"Transcription failed: {result['error']}")

@app.route("/upload_audio", methods=["POST"])
@login_required
def upload_audio():
    if "audio" not in request.files:
        flash("No audio file selected.", "error")
        return redirect(url_for("index"))

    file = request.files["audio"]
    if file.filename == "":
        flash("No audio file selected.", "error")
        return redirect(url_for("index"))

    if not allowed_file(file.filename, ALLOWED_AUDIO_EXTENSIONS):
        flash("Invalid format.", "error")
        return redirect(url_for("index"))

    filename = secure_filename(file.filename)
    if not filename:
        filename = "audio_file"
    filepath = os.path.join(UPLOAD_FOLDER_AUDIO, filename)
    file.save(filepath)

    candidate_id = session.get("last_candidate_id")
    if candidate_id:
        candidate = get_candidate_by_id(candidate_id)
        if candidate:
            # Fire and forget async transcription
            executor.submit(process_audio, filepath, candidate["name"])
            flash("Audio uploaded! Transcription is running in the background.", "info")
            return redirect(url_for("results"))
            
    flash("Please upload a resume first before attaching audio.", "error")
    return redirect(url_for("index"))

@app.route("/results")
@login_required
def results():
    candidate_id = session.get("last_candidate_id")
    candidate = get_candidate_by_id(candidate_id) if candidate_id else None
    
    candidates = get_all_candidates()
    return render_template("results.html", candidate=candidate, candidate_count=len(candidates))

@app.route("/ranking", methods=["GET", "POST"])
@login_required
def ranking():
    candidates = get_all_candidates()
    job_description = ""
    ranked = list(candidates)

    if request.method == "POST":
        job_description = request.form.get("job_description", "").strip()
        if job_description and candidates:
            from skill_extractor import extract_skills
            jd_skills = extract_skills(job_description)
            ranked = rank_candidates(candidates, job_description, jd_skills)

    return render_template("ranking.html", ranked=ranked, job_description=job_description, candidate_count=len(candidates))

@app.route("/clear")
@login_required
def clear():
    clear_all_candidates()
    session.pop("last_candidate_id", None)
    flash("All candidate data cleared from database.", "info")
    return redirect(url_for("index"))

if __name__ == "__main__":
    app.run(debug=True, port=5000)
  