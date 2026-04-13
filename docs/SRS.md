# Software Requirement Specification (SRS)
## Resume Screening System

## 1. Introduction
### 1.1 Purpose
This document specifies the software requirements for the Resume Screening System, an AI-powered system designed to automate resume parsing, evaluation, and ranking.

### 1.2 Scope
The system allows HR and recruiters to upload candidate resumes (PDF/DOCX) and optional intro audio files. It extracts key candidate information, including skills, education, and experience, and calculates a match score against a provided Job Description (JD). 

### 1.3 Definitions and Acronyms
- **SRS:** Software Requirement Specification
- **JD:** Job Description
- **TF-IDF:** Term Frequency-Inverse Document Frequency
- **NLP:** Natural Language Processing

## 2. Overall System Description
The Resume Screening System is a web-based application (built with Flask) with a machine learning backend that processes submitted documents and audio files. It provides real-time scoring, skill gap analysis, and candidate leaderboards.

## 3. User Personas
- **Recruiter:** Responsible for uploading batches of resumes, inputting the Job Description, and viewing candidate rankings.
- **HR Manager:** Oversees the hiring process, reviews deep-dive analytics on candidate skill gaps, and accesses transcribed audio intros.
- **Admin:** Manages application settings, AI model configurations, and system health.

## 4. Functional Requirements
- **FR_01 (Document Upload):** System shall accept PDF and DOCX uploads for resumes.
- **FR_02 (Audio Upload):** System shall accept audio files (MP3, WAV, etc.) and transcribe them using OpenAI Whisper.
- **FR_03 (Text Extraction):** System shall extract text and clean URLs, emails, and special characters.
- **FR_04 (Skill Recognition):** System shall identify domain skills, education, and experience from the text.
- **FR_05 (Job Matching):** System shall accept a JD and output a match score (0-100) using cosine similarity.
- **FR_06 (Gap Analysis):** System shall display matched and missing skills visually.
- **FR_07 (Leaderboard):** System shall maintain a ranked list of candidates based on their score for a specific JD.

## 5. Non-Functional Requirements
- **NFR_01 (Performance):** Text parsing and scoring should complete within 3 seconds per resume. Audio transcription (Whisper base) should complete within 30 seconds for a 1-minute audio.
- **NFR_02 (Scalability):** System should support concurrent uploads using Celery/Redis for background task processing.
- **NFR_03 (Security):** Uploaded files must be scanned for malicious content. User sessions must be authenticated. Data must be sanitized before processing.

## 6. System Architecture
- **Frontend:** HTML5, CSS3, JavaScript (Jinja2 Templates)
- **Backend Core:** Python, Flask 3.x
- **ML / AI Module:** scikit-learn (TF-IDF), NLTK, OpenAI Whisper
- **Task Queue (Planned):** Celery + Redis for asynchronous processing

## 7. Database Design
*Using MongoDB Atlas for data persistence, and Cloudinary for file storage.*

### Collections:
- **Users:** `_id`, `username`, `role`, `email`, `password_hash`, `created_at`
- **Jobs:** `_id`, `title`, `description`, `created_by`, `status`
- **Candidates:** `_id`, `name`, `filename`, `resume_url`, `audio_url`, `skills`, `match_score`, `audio_transcription`
- **Applications:** `_id`, `job_id`, `candidate_id`, `match_score`, `extracted_skills`, `missing_skills`, `transcript`, `created_at`

### Relationships
- User (1) to Many (Jobs)
- Job (1) to Many (Applications)
- Candidate (1) to Many (Applications)

## 8. API Design
- `POST /api/v1/resumes/upload` - Upload resume file(s)
- `POST /api/v1/jobs` - Create a new Job Description
- `POST /api/v1/match` - Return match scores for candidate(s) against a JD
- `GET /api/v1/candidates/{id}` - Fetch details, transcript, and gap analysis
- `GET /api/v1/leaderboard/{job_id}` - Fetch ranked list for a specific job

## 9. Future Enhancements
- Transition to advanced embeddings (BERT/Sentence-Transformers) for semantic matching.
- Integrating LLMs (e.g., GPT-4 / Claude) for qualitative resume summaries.
- Webhook integrations with ATS platforms (Greenhouse, Workable).
