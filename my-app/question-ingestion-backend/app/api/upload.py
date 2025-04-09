from fastapi import APIRouter, File, UploadFile, HTTPException, Form
from app.config import supabase
from app.services.pdf_service import extract_text_from_pdf_url
from app.services.llm_service import extract_questions
import uuid
import os
import csv
from io import StringIO

router = APIRouter()

# Try to import PyPDF2, but don't fail if it's not available
try:
    import PyPDF2
    PYPDF2_AVAILABLE = True
except ImportError:
    PYPDF2_AVAILABLE = False
    print("WARNING: PyPDF2 is not installed. PDF processing will be limited.")

@router.post("/upload")
async def upload_file(file: UploadFile, file_type: str = Form(...)):
    """
    Upload a file (CSV or PDF) containing questions to be added to the database.
    """
    try:
        # Handle different file types
        if file_type == 'csv':
            # Process CSV file
            content = await file.read()
            text = content.decode('utf-8')
            
            # Parse CSV
            questions = process_csv(text)
            
        elif file_type == 'pdf':
            # Process PDF file
            content = await file.read()
            
            # Save the file temporarily
            temp_pdf_path = f"temp_{uuid.uuid4()}.pdf"
            with open(temp_pdf_path, "wb") as temp_file:
                temp_file.write(content)
            
            try:
                # Extract questions from PDF using OpenAI
                if PYPDF2_AVAILABLE:
                    extracted_text = extract_text_from_pdf_local(temp_pdf_path)
                else:
                    # Fallback to using a different method if PyPDF2 is not available
                    raise ImportError("PyPDF2 is required for PDF processing")
                
                questions = extract_questions(extracted_text, model="gpt-4")
                
                # Transform questions to match database format
                questions = transform_pdf_questions(questions)
            finally:
                # Clean up temp file
                if os.path.exists(temp_pdf_path):
                    os.remove(temp_pdf_path)
        else:
            raise HTTPException(status_code=400, detail="Unsupported file type")
            
        # Insert questions into database
        uploaded_count = insert_questions_into_db(questions)
        
        return {"message": "File processed successfully", "uploaded_count": uploaded_count}
        
    except ImportError as e:
        raise HTTPException(status_code=400, detail=f"PDF processing failed: {str(e)}. Please install PyPDF2.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def extract_text_from_pdf_local(file_path):
    """
    Extract text from a local PDF file using PyPDF2.
    """
    if not PYPDF2_AVAILABLE:
        raise ImportError("PyPDF2 is not installed")
        
    try:
        with open(file_path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            text = ""
            for page in reader.pages:
                text += page.extract_text()
        
        return text
    except Exception as e:
        print(f"Error extracting text from PDF: {e}")
        raise Exception(f"Failed to extract text from PDF: {str(e)}")

def process_csv(csv_text):
    """
    Process CSV text and convert it to questions format.
    """
    questions = []
    
    try:
        csv_file = StringIO(csv_text)
        csv_reader = csv.DictReader(csv_file)
        
        for row in csv_reader:
            # Convert skill tags to a list if it exists
            skill_tags = []
            if 'skill_tags' in row and row['skill_tags']:
                skill_tags = [tag.strip() for tag in row['skill_tags'].split(',')]
                
            # Split options string into array
            options = []
            if 'options' in row and row['options']:
                options = [opt.strip() for opt in row['options'].split(',')]
                
            # Create question object
            question = {
                'question_text': row.get('question_text', ''),
                'options': options,
                'correct_answer': int(row.get('correct_answer', 0)) if row.get('correct_answer', '').isdigit() else 0,
                'difficulty': row.get('difficulty', 'Medium'),
                'topic_id': int(row.get('topic_id', 1)) if row.get('topic_id', '').isdigit() else 1,
                'bloom_level': row.get('bloom_level', 'Knowledge'),
                'skill_tags': skill_tags
            }
            
            questions.append(question)
    
    except Exception as e:
        print(f"Error processing CSV: {e}")
    
    return questions

def transform_pdf_questions(pdf_questions):
    """
    Transform questions extracted from PDF to match database schema.
    """
    transformed_questions = []
    
    for q in pdf_questions:
        # Map correct_option letter to index
        correct_index = None
        if q.get("correct_option"):
            option_map = {"A": 0, "B": 1, "C": 2, "D": 3, "E": 4}
            correct_index = option_map.get(q.get("correct_option"))
        
        # Clean the options to remove the letter prefixes (A., B., etc.)
        cleaned_options = []
        for option in q.get("options", []):
            # Remove letter prefix if present (e.g., "A. Option" → "Option")
            if option and len(option) >= 2 and option[0].isalpha() and option[1] == '.':
                cleaned_option = option[2:].strip()
                cleaned_options.append(cleaned_option)
            else:
                cleaned_options.append(option)
        
        # Get topic ID from topic name
        topic_id = get_topic_id_by_name(q.get("topic", "General Intelligence and Reasoning"))
        
        # Convert skill_tags to array if it's a string
        skill_tags = q.get("skill_tags", [])
        if isinstance(skill_tags, str):
            skill_tags = [tag.strip() for tag in skill_tags.split(",")]
        
        # Create transformed question
        transformed_q = {
            "question_text": q.get("question_text", ""),
            "options": cleaned_options,
            "correct_answer": correct_index,
            "difficulty": q.get("difficulty", "Medium"),
            "topic_id": topic_id,
            "bloom_level": q.get("bloom_level", "Knowledge"),
            "skill_tags": skill_tags
        }
        
        transformed_questions.append(transformed_q)
    
    return transformed_questions

def get_topic_id_by_name(topic_name):
    """
    Get the topic ID by name, or use a default if not found.
    """
    try:
        response = supabase.from_("topics").select("id").eq("topic_name", topic_name).single().execute()
        
        if response.data:
            return response.data["id"]
        
        # If no exact match, try a LIKE query
        response = supabase.from_("topics").select("id").like("topic_name", f"%{topic_name}%").limit(1).execute()
        
        if response.data and len(response.data) > 0:
            return response.data[0]["id"]
            
        # Default topic ID if not found
        return 46  # Use General Intelligence and Reasoning as default topic ID
    except Exception as e:
        print(f"Error getting topic ID: {e}")
        return 46  # Default topic ID for General Intelligence and Reasoning

def insert_questions_into_db(questions):
    """
    Insert questions into the database based on the actual schema
    """
    uploaded_count = 0
    
    for q in questions:
        try:
            # First insert the question
            question_response = supabase.from_("questions").insert({
                "question_text": q["question_text"],
                "difficulty": q["difficulty"],
                "topic_id": q["topic_id"]
            }).execute()
            
            if not question_response.data:
                print(f"Failed to insert question: {q['question_text'][:50]}...")
                continue
                
            question_id = question_response.data[0]["id"]
            
            # Insert question options in the separate options table
            for i, option_text in enumerate(q["options"]):
                is_correct = (i == q["correct_answer"])
                
                option_response = supabase.from_("question_options").insert({
                    "question_id": question_id,
                    "option_text": option_text,
                    "is_correct": is_correct
                }).execute()
                
                if not option_response.data:
                    print(f"Failed to insert option for question ID {question_id}")
            
            # Insert metadata
            metadata_response = supabase.from_("question_metadata").insert({
                "question_id": question_id,
                "bloom_level": q["bloom_level"],
                "skill_tags": q["skill_tags"]
            }).execute()
            
            if not metadata_response.data:
                print(f"Failed to insert metadata for question ID {question_id}")
            
            uploaded_count += 1
            
        except Exception as e:
            print(f"Error inserting question: {e}")
    
    return uploaded_count 