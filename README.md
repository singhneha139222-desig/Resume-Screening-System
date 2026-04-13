# 📄 Resume Screening System

An AI-powered web application that parses resumes, extracts key information, matches candidates to job descriptions, and ranks them — built with Flask, scikit-learn, OpenAI Whisper, MongoDB Atlas, and Cloudinary.

![Python](https://img.shields.io/badge/Python-3.9+-blue)
![Flask](https://img.shields.io/badge/Flask-3.x-green)
![License](https://img.shields.io/badge/License-MIT-yellow)

---

## ✨ Features

| Feature | Description |
|---|---|
| **Resume Upload** | Upload PDF or DOCX files for automatic text extraction |
| **Skill Extraction** | Keyword-based detection of skills, education, and experience |
| **Job Matching** | TF-IDF + cosine similarity scoring (0–100) against a job description |
| **Skill Gap Analysis** | Shows matched ✅ and missing ❌ skills for each candidate |
| **Audio Transcription** | Upload voice recordings → text via OpenAI Whisper |
| **Candidate Ranking** | Rank all uploaded resumes by match score in a leaderboard |

---

## 🗂️ Project Structure

```
Resume-Screening-System/
├── app.py                    # Flask app (routes & logic)
├── resume_parser.py          # PDF/DOCX text extraction
├── skill_extractor.py        # Keyword-based info extraction
├── job_matcher.py            # TF-IDF matching & ranking
├── audio_transcriber.py      # Whisper speech-to-text
├── requirements.txt          # Dependencies
├── static/css/style.css      # Stylesheet (dark theme)
├── templates/
│   ├── base.html             # Shared layout
│   ├── index.html            # Upload page
│   ├── results.html          # Analysis results
│   └── ranking.html          # Candidate ranking
└── uploads/                  # Runtime upload storage
    ├── resumes/
    └── audio/
```

---

## 🚀 How to Run

### Prerequisites

- **Python 3.9+** installed
- **ffmpeg** installed (required for Whisper audio processing)
  - Windows: `winget install ffmpeg`
  - Mac: `brew install ffmpeg`
  - Linux: `sudo apt install ffmpeg`

### Step-by-Step Setup

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/Resume-Screening-System.git
cd Resume-Screening-System

# 2. Create a virtual environment
python -m venv venv

# 3. Activate the virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# 4. Install dependencies
pip install -r requirements.txt

# 5. Download NLTK data (one-time)
python -c "import nltk; nltk.download('stopwords'); nltk.download('punkt')"

# 5. Environment Variables
Create a `.env` file in the root directory:
```env
MONGO_URI="mongodb+srv://<username>:<password>@cluster.mongodb.net/resume_screener?retryWrites=true&w=majority"
CLOUDINARY_URL="cloudinary://<api_key>:<api_secret>@<cloud_name>"
```

# 6. Run the application
python app.py
```

### Open in Browser

```
http://127.0.0.1:5000
```

---

## ☁️ Deploying to Hugging Face Spaces

This project is configured to run flawlessly on Hugging Face Spaces using a Docker environment.

1. Go to [Hugging Face Spaces](https://huggingface.co/spaces) and create a new Space.
2. Select **Docker** as the SDK and choose the Default template.
3. Upload all project files to your Space's repository (or push via Git).
4. Go to the **Settings** tab of your Space.
5. In the **Variables and secrets** section, add your environment secrets:
   - `MONGO_URI`
   - `CLOUDINARY_URL`
6. The provided `Dockerfile` will automatically install `ffmpeg`, Python dependencies, and run the app via `gunicorn` on port `7860`.

---

## 📖 How It Works

### 1. Resume Parsing
- **PDF** files are parsed using `PyPDF2`
- **DOCX** files are parsed using `python-docx`
- Text is cleaned: lowercased, URLs/emails removed, special characters stripped

### 2. Information Extraction
- Predefined keyword lists match against cleaned text
- Categories: **Skills** (60+ tech/soft skills), **Education**, **Experience**

### 3. Job Matching (TF-IDF)
```
Resume Text  →  TF-IDF Vector  ─┐
                                 ├→  Cosine Similarity  →  Score (0-100)
Job Description  →  TF-IDF Vector ─┘
```
- Both texts are vectorized using TF-IDF (Term Frequency–Inverse Document Frequency)
- Cosine similarity measures the angle between the two vectors
- Result is scaled to a 0–100 percentage

### 4. Audio Transcription
- Uses OpenAI's Whisper (`base` model by default)
- Supports MP3, WAV, M4A, FLAC, OGG, WEBM
- Runs locally — no API key required

### 5. Candidate Ranking
- All analyzed resumes are stored in memory
- Ranking page lets you enter/update a job description
- Candidates are sorted by match score (highest first)

---

## 🛠️ Tech Stack

| Component | Technology |
|---|---|
| Backend | Flask 3.x |
| Text Extraction | PyPDF2, python-docx |
| NLP | NLTK, scikit-learn (TF-IDF) |
| Audio | OpenAI Whisper |
| Frontend | HTML5, CSS3 (custom dark theme) |

---

## 📝 Notes

- All candidate data is durably stored in **MongoDB Atlas**, and uploaded files are saved in **Cloudinary**.
- The Whisper `base` model (~140MB) runs on CPU — first load takes ~30 seconds
- For better transcription accuracy, use the `small` or `medium` model (edit `audio_transcriber.py`)

---

## 📄 License

This project is for educational purposes. Feel free to use and modify.
