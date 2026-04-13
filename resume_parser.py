"""
resume_parser.py
----------------
Handles extracting text from PDF and DOCX resume files,
and cleaning the raw text for further processing.
"""

import re
import os
from PyPDF2 import PdfReader
from docx import Document


def extract_text_from_pdf(filepath):
    """
    Extract all text from a PDF file.
    
    Args:
        filepath (str): Path to the PDF file.
    
    Returns:
        str: Extracted text from all pages.
    """
    text = ""
    try:
        reader = PdfReader(filepath)
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    except Exception as e:
        print(f"[ERROR] Failed to read PDF: {e}")
    return text


def extract_text_from_docx(filepath):
    """
    Extract all text from a DOCX file.
    
    Args:
        filepath (str): Path to the DOCX file.
    
    Returns:
        str: Extracted text from all paragraphs.
    """
    text = ""
    try:
        doc = Document(filepath)
        for para in doc.paragraphs:
            text += para.text + "\n"
    except Exception as e:
        print(f"[ERROR] Failed to read DOCX: {e}")
    return text


def extract_text(filepath):
    """
    Detect file type and extract text accordingly.
    
    Args:
        filepath (str): Path to a PDF or DOCX file.
    
    Returns:
        str: Extracted raw text.
    
    Raises:
        ValueError: If the file format is not supported.
    """
    ext = os.path.splitext(filepath)[1].lower()

    if ext == ".pdf":
        return extract_text_from_pdf(filepath)
    elif ext == ".docx":
        return extract_text_from_docx(filepath)
    else:
        raise ValueError(f"Unsupported file format: {ext}. Use PDF or DOCX.")


def clean_text(raw_text):
    """
    Clean and normalize extracted text.
    
    Steps:
        1. Convert to lowercase
        2. Remove URLs
        3. Remove email addresses
        4. Remove special characters (keep letters, numbers, spaces, and +, #, -, ., /)
        5. Collapse multiple spaces into one
        6. Strip leading/trailing whitespace
    
    Args:
        raw_text (str): The raw extracted text.
    
    Returns:
        str: Cleaned text ready for NLP processing.
    """
    text = raw_text.lower()

    # Remove URLs
    text = re.sub(r"http\S+|www\.\S+", "", text)

    # Remove email addresses
    text = re.sub(r"\S+@\S+\.\S+", "", text)

    # Remove special characters but keep letters, numbers, spaces, and specific symbols (+, #, -, ., /)
    text = re.sub(r"[^a-z0-9\s\+\#\-\.\/]", " ", text)

    # Collapse multiple spaces
    text = re.sub(r"\s+", " ", text)

    return text.strip()
 