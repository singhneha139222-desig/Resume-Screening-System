FROM python:3.9-slim

WORKDIR /app

# Install system dependencies, explicitly ffmpeg for Whisper
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Expose port required by Hugging Face Spaces (Docker spaces)
EXPOSE 7860

# Specify environment variable to run on port 7860
ENV FLASK_RUN_PORT=7860
ENV FLASK_RUN_HOST=0.0.0.0

CMD ["gunicorn", "-b", "0.0.0.0:7860", "app:app", "--timeout", "120", "--workers", "2", "--threads", "4"]
