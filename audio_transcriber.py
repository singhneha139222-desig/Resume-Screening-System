"""
audio_transcriber.py
--------------------
Converts audio files to text using OpenAI's Whisper model.
Requires ffmpeg to be installed on the system.
"""

import whisper

# Cache the model so it's only loaded once
_model = None


def _get_model(model_name="base"):
    """
    Load and cache the Whisper model.
    
    Available models (smallest to largest):
        tiny, base, small, medium, large
    
    Args:
        model_name (str): Which Whisper model to use.
    
    Returns:
        whisper.Whisper: The loaded model.
    """
    global _model
    if _model is None:
        print(f"[INFO] Loading Whisper '{model_name}' model (first time may take a while)...")
        _model = whisper.load_model(model_name)
        print("[INFO] Whisper model loaded successfully.")
    return _model


def transcribe_audio(filepath, model_name="base"):
    """
    Transcribe an audio file to text using Whisper.
    
    Supported formats: mp3, wav, m4a, flac, ogg, webm
    
    Args:
        filepath (str): Path to the audio file.
        model_name (str): Whisper model size (default: "base").
    
    Returns:
        dict: {
            "text": str,        # Full transcription
            "language": str,    # Detected language
            "success": bool,    # Whether transcription succeeded
            "error": str|None   # Error message if failed
        }
    """
    try:
        model = _get_model(model_name)
        result = model.transcribe(filepath)

        return {
            "text": result["text"].strip(),
            "language": result.get("language", "unknown"),
            "success": True,
            "error": None,
        }

    except FileNotFoundError:
        return {
            "text": "",
            "language": "",
            "success": False,
            "error": "Audio file not found. Please check the file path.",
        }

    except Exception as e:
        error_msg = str(e)
        # Check for common ffmpeg error
        if "ffmpeg" in error_msg.lower():
            error_msg = (
                "ffmpeg is not installed or not found in PATH. "
                "Please install ffmpeg: https://ffmpeg.org/download.html"
            )
        return {
            "text": "",
            "language": "",
            "success": False,
            "error": error_msg,
        }
 