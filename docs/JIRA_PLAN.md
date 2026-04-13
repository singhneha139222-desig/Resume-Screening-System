# Jira Integration & Ticketing Plan

## 1. Jira Workflow Configuration

### 1.1 Project Structure
- **Project Name:** AI Resume Screener (ARS)
- **Project Type:** Software Development (Scrum)
- **Sprint Duration:** 2 weeks

### 1.2 Issue Types
- **Epic:** Large-scale features (e.g., "Authentication", "Advanced ML Matching").
- **Story:** User requirements creating value (e.g., "As a Recruiter, I can upload a batch of PDFs...").
- **Task:** Technical items not directly tied to a user persona (e.g., "Set up PostgreSQL database").
- **Bug:** Defects or unexpected behavior (e.g., "PDF parser crashing on encrypted files").
- **Subtask:** Bite-sized developer tasks (e.g., "Write unit tests for TF-IDF matcher").

### 1.3 Priority Levels
- **Highest:** Blocks core functionality or production deployment.
- **High:** Important features missing, severe UX issues.
- **Medium:** Standard user stories and features.
- **Low:** Nice-to-haves, minor UI tweaks, tech debt.

### 1.4 Labels
`backend`, `frontend`, `ml-model`, `infrastructure`, `audio-processing`, `security`, `database`, `resume`

---

## 2. Epics, User Stories, and Tasks Breakdown

### Epic 1: Database & Persistence Layer (ARS-100)
*Transitioned to MongoDB Atlas and Cloudinary.*
- **Story: Candidate Data Persistence (ARS-101)**
  - *Acceptance Criteria:* Resumes uploaded are saved to Cloudinary, metadata saved to MongoDB.
  - **Task:** Finalize MongoDB schema for Users, Jobs, Candidates.
  - **Task:** Integrate PyMongo in Flask and establish Cloudinary URL handling.
- **Story: Job Description Storage (ARS-102)**
  - *Acceptance Criteria:* Recruiters can save and reuse JDs instead of pasting them each time.
  - **Task:** Create JD creation and retrieval REST endpoints.

### Epic 2: Advanced AI & ML Pipeline (ARS-200)
- **Story: Semantic Skill Matching (ARS-201)**
  - *Acceptance Criteria:* System matches "Machine Learning" to "Deep Learning" conceptually, not just exactly.
  - **Task:** Replace TF-IDF with HuggingFace Sentence Transformers.
  - **Task:** Implement vector similarity search for candidate ranking.
- **Story: Asynchronous Audio Transcription (ARS-202)**
  - *Acceptance Criteria:* Audio uploads don't block the UI while Whisper processes them.
  - **Task:** Implement Celery worker queue in Flask.
  - **Task:** Add Redis container as message broker.

### Epic 3: User Authentication & Roles (ARS-300)
- **Story: Recruiter Login (ARS-301)**
  - *Acceptance Criteria:* Users must log in to upload resumes or view leaderboards.
  - **Task:** Create login and registration UI pages.
  - **Task:** Implement JWT/Session-based authentication in Flask.
  - **Task:** Implement Role-Based Access Control filtering (Admin vs Recruiter).

### Epic 4: Dashboard & Analytics UI (ARS-400)
- **Story: Interactive Leaderboard (ARS-401)**
  - *Acceptance Criteria:* Recruiter can filter, sort, and search candidates on the leaderboard.
  - **Task:** Build React/JS datatable for the leaderboard view.
  - **Task:** Add "View Details" modal for expanding candidate skill gaps and viewing audio transcript.
