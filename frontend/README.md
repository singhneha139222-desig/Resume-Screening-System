# TalentScan — Resume Screening System

A full-stack AI-powered resume screening application with a beautiful dark UI, scoring engine, and candidate management.

---

## 📁 Project Structure

```
resume-screening/
├── backend/
│   ├── server.js          ← Express API server
│   ├── package.json       ← Node dependencies
│   └── uploads/           ← Auto-created for resume files
│
└── frontend/
    ├── index.html         ← Main HTML shell
    ├── styles.css         ← Full design system
    └── app.js             ← All frontend logic
```

---

## 🚀 Setup & Run

### Prerequisites
- Node.js v18+
- npm

### 1. Install & Start Backend

```bash
cd backend
npm install
npm start
# Server runs on http://localhost:3001
```

For development with auto-reload:
```bash
npm run dev
```

### 2. Start Frontend

Open `frontend/index.html` in a browser.

> **Tip**: Use Live Server (VS Code extension) or any static file server for best results.

```bash
# With Python
cd frontend
python -m http.server 8080
# Visit http://localhost:8080
```

---

## ✨ Features

### Dashboard
- Live stats: open positions, total applicants, shortlisted, under review, rejected, avg score
- Applications by role bar chart
- Recent candidates list with quick scores

### Job Management
- Create, edit, delete job postings
- Set required skills, experience level, education, department
- Job cards with skill tags

### Resume Submission (Apply Page)
- Multi-field application form
- File upload (PDF, DOC, DOCX, TXT — max 5MB)
- Instant AI screening results with animated score ring
- Score breakdown across 4 dimensions

### Candidate Management
- Full table with search, filter by status & job
- Score bars with color coding
- Detailed candidate modal with full screening report
- Manual status override (Shortlist / Review / Reject)
- Delete candidates

---

## 🧠 Screening Algorithm

Scores are calculated out of **100 points**:

| Dimension   | Max Points | Logic |
|-------------|------------|-------|
| Skills      | 40         | % of required skills matched |
| Experience  | 30         | Full points if meets/exceeds; partial if close |
| Education   | 20         | Level comparison (High School → PhD) |
| Bonus       | 10         | Summary present (+5), certifications (+5) |

### Decision Thresholds
| Score    | Status        |
|----------|---------------|
| 80–100   | ✅ Shortlisted |
| 55–79    | 🔄 Under Review |
| 0–54     | ❌ Rejected    |

---

## 🔌 API Reference

| Method | Endpoint                        | Description              |
|--------|---------------------------------|--------------------------|
| GET    | `/api/jobs`                     | List all jobs            |
| POST   | `/api/jobs`                     | Create job               |
| PUT    | `/api/jobs/:id`                 | Update job               |
| DELETE | `/api/jobs/:id`                 | Delete job               |
| GET    | `/api/candidates`               | List candidates (filterable) |
| GET    | `/api/candidates/:id`           | Get single candidate     |
| POST   | `/api/candidates`               | Submit + screen resume   |
| PUT    | `/api/candidates/:id/status`    | Update candidate status  |
| DELETE | `/api/candidates/:id`           | Delete candidate         |
| GET    | `/api/stats`                    | Dashboard statistics     |

### Query Params for GET /api/candidates
- `?jobId=1` — filter by job
- `?status=Shortlisted` — filter by status
- `?search=react` — search name/email/skills

---

## 🛠 Tech Stack

| Layer     | Technology                   |
|-----------|------------------------------|
| Backend   | Node.js, Express, Multer     |
| Frontend  | Vanilla HTML/CSS/JS          |
| Storage   | In-memory (no DB needed)     |
| Fonts     | DM Serif Display + DM Sans   |
| Design    | Custom dark design system    |

> **Note**: Data resets on server restart. For persistence, replace the in-memory arrays with MongoDB, SQLite, or PostgreSQL.

---

## 🔧 Extending

### Add a Database (MongoDB example)
```bash
npm install mongoose
```
Replace the in-memory `jobs[]` and `candidates[]` arrays with Mongoose models.

### Add Authentication
```bash
npm install jsonwebtoken bcryptjs
```
Add JWT middleware to protect HR-only routes.

### Parse Real PDFs
```bash
npm install pdf-parse
```
Extract text from uploaded PDFs to auto-populate skills/experience.
