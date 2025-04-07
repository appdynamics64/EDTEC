import requests
import pdfplumber
from io import BytesIO

def extract_text_from_pdf_url(pdf_url: str) -> str:
    try:
        # Download the PDF file
        response = requests.get(pdf_url)
        response.raise_for_status()  # Raise an error for bad responses

        # Load the PDF with pdfplumber
        with pdfplumber.open(BytesIO(response.content)) as pdf:
            # Extract text from all pages
            full_text = ""
            for page in pdf.pages:
                full_text += page.extract_text() or ""

        return full_text

    except Exception as e:
        raise RuntimeError(f"Failed to extract text from PDF: {str(e)}") 