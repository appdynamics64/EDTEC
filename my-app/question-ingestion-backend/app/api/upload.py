from fastapi import APIRouter, File, UploadFile, HTTPException
from app.config import supabase
from app.services.pdf_service import extract_text_from_pdf_url
from app.services.llm_service import extract_questions
import uuid

router = APIRouter()

@router.post("/upload/")
async def upload_file(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        file_id = str(uuid.uuid4())
        file_path = f"{file_id}_{file.filename}"

        # Upload file to Supabase Storage
        supabase.storage.from_("uploads-pdf").upload(file_path, contents)
        file_url = supabase.storage.from_("uploads-pdf").get_public_url(file_path)

        # Extract text from the PDF
        extracted_text = extract_text_from_pdf_url(file_url)

        # Extract questions using LLM
        structured_questions = extract_questions(extracted_text, model="gpt-4")

        questions_parsed = 0
        for q in structured_questions:
            # Validate the question object
            if not isinstance(q, dict) or "question_text" not in q or "difficulty" not in q:
                print("Skipping malformed question item:", q)
                continue

            # Resolve subject_id
            subject_name = q.get("subject", "").strip()
            if subject_name:
                subject_result = supabase.table("subjects").select("id").eq("subject_name", subject_name).execute()
                if subject_result.data:
                    subject_id = subject_result.data[0]["id"]
                else:
                    subject_insert = supabase.table("subjects").insert({"subject_name": subject_name}).execute()
                    if subject_insert.data:
                        subject_id = subject_insert.data[0]["id"]
                    else:
                        print(f"Failed to insert subject: {subject_name}")
                        continue  # Skip if subject insertion fails
            else:
                print("Skipping question due to missing subject name:", q)
                continue  # Skip if subject name is missing

            # Resolve topic_id
            topic_name = q.get("topic", "").strip()
            if topic_name:
                topic_result = supabase.table("topics").select("id").eq("topic_name", topic_name).eq("subject_id", subject_id).execute()
                if topic_result.data:
                    topic_id = topic_result.data[0]["id"]
                else:
                    topic_insert = supabase.table("topics").insert({"topic_name": topic_name, "subject_id": subject_id}).execute()
                    if topic_insert.data:
                        topic_id = topic_insert.data[0]["id"]
                    else:
                        print(f"Failed to insert topic: {topic_name}")
                        continue  # Skip if topic insertion fails
            else:
                print("Skipping question due to missing topic name:", q)
                continue  # Skip if topic name is missing

            # Insert into questions table
            question_insert_response = supabase.table('questions').insert({
                "question_text": q["question_text"],
                "difficulty": q["difficulty"],
                "topic_id": topic_id,
                "explanation": q.get("explanation", "")
            }).execute()

            if question_insert_response.data is None:
                raise HTTPException(status_code=500, detail="Failed to insert question into database.")

            question_id = question_insert_response.data[0]["id"]

            # Insert into question_metadata table
            metadata_insert_response = supabase.table('question_metadata').insert({
                "question_id": question_id,
                "bloom_level": q.get("bloom_level", ""),
                "skill_tags": q.get("skill_tags", []),
                "question_context": q.get("question_context", ""),
                "keywords": q.get("keywords", []),
                "source_type": q.get("source_type", ""),
                "reference_links": q.get("reference_links", []),
                "language": q.get("language", "English"),
                "estimated_time": int(q["estimated_time"]) if str(q.get("estimated_time", "")).isdigit() else None
            }).execute()

            if metadata_insert_response.data is None:
                raise HTTPException(status_code=500, detail="Failed to insert question metadata into database.")

            questions_parsed += 1

        # Update uploaded_files table
        update_response = supabase.table('uploaded_files').update({
            "status": "completed",
            "processing_logs": f"questions_parsed: {questions_parsed}, model_used: gpt-4"
        }).eq("file_url", file_url).execute()

        if update_response.data is None:
            raise HTTPException(status_code=500, detail="Failed to update uploaded file status.")

        return {
            "success": True,
            "file_url": file_url,
            "questions_parsed": questions_parsed
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 