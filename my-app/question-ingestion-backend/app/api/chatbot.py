from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from app.config import supabase
import os
from openai import OpenAI

# Initialize OpenAI client
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

router = APIRouter()

class SearchFilters(BaseModel):
    subject: Optional[str] = None
    topic: Optional[str] = None
    difficulty: Optional[str] = None
    bloom_level: Optional[str] = None
    skill_tags: Optional[List[str]] = None
    limit: int = 10

@router.post("/chatbot/search")
async def search_questions(filters: SearchFilters):
    try:
        query = supabase.from_("questions").select(
            """
            id,
            question_text,
            difficulty
            """
        )

        if filters.subject:
            query = query.eq("subject", filters.subject)
        if filters.topic:
            query = query.eq("topic", filters.topic)
        if filters.difficulty:
            query = query.eq("difficulty", filters.difficulty)
        if filters.bloom_level:
            query = query.eq("bloom_level", filters.bloom_level)
        if filters.skill_tags:
            query = query.contains("skill_tags", filters.skill_tags)

        query = query.limit(filters.limit)

        response = query.execute()

        if response.error:
            raise HTTPException(status_code=500, detail=response.error.message)

        return response.data

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/chatbot/search")
def chatbot_search_info():
    return {"message": "Use POST with filters to search questions."}

class ExplainRequest(BaseModel):
    question_id: int

@router.post("/chatbot/explain")
async def explain_question_endpoint(request: ExplainRequest):
    try:
        # Step 1: Fetch question data
        question_response = supabase.from_("questions").select(
            "question_text, difficulty, topic_id, explanation"
        ).eq("id", request.question_id).single().execute()

        if not question_response.data:
            raise HTTPException(status_code=404, detail="Question not found")

        question_data = question_response.data

        # Step 2: Check if explanation already exists
        if question_data.get("explanation"):
            return {"question_id": request.question_id, "explanation": question_data["explanation"]}

        # Step 3: Fetch additional info with correct column names
        topic_response = supabase.from_("topics").select(
            "topic_name, subject_id"  # Using the correct column name
        ).eq("id", question_data["topic_id"]).single().execute()

        if not topic_response.data:
            raise HTTPException(status_code=404, detail="Topic not found")

        topic_data = topic_response.data
        topic_name = topic_data["topic_name"]  # Use the correct column name

        subject_response = supabase.from_("subjects").select(
            "subject_name"  # Using the correct column name
        ).eq("id", topic_data["subject_id"]).single().execute()

        if not subject_response.data:
            raise HTTPException(status_code=404, detail="Subject not found")

        subject_data = subject_response.data
        subject_name = subject_data["subject_name"]  # Use the correct column name

        metadata_response = supabase.from_("question_metadata").select(
            "bloom_level, skill_tags"
        ).eq("question_id", request.question_id).single().execute()

        if not metadata_response.data:
            raise HTTPException(status_code=404, detail="Metadata not found")

        metadata_data = metadata_response.data

        # Step 4: Construct the GPT-4 prompt
        prompt = (
            f"Please explain the following question in simple language for a student preparing for SSC CGL:\n\n"
            f"Question: {question_data['question_text']}\n"
            f"Topic: {topic_name}, Subject: {subject_name}, "
            f"Difficulty: {question_data['difficulty']}, Bloom Level: {metadata_data['bloom_level']}\n"
            f"Skill Tags: {', '.join(metadata_data['skill_tags'])}\n"
        )

        # Step 5: Call OpenAI GPT to generate explanation
        gpt_response = openai_client.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.5
        )

        explanation = gpt_response.choices[0].message.content.strip()

        # Step 6: Save the explanation back to the questions table
        update_response = supabase.from_("questions").update({
            "explanation": explanation
        }).eq("id", request.question_id).execute()

        if not update_response.data:
            raise HTTPException(status_code=500, detail="Failed to update question with explanation.")

        # Step 7: Return the explanation in the response
        return {"question_id": request.question_id, "explanation": explanation}

    except Exception as e:
        # We can keep the error logging for debugging
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e)) 