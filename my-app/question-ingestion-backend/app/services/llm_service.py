import os
import json
from typing import List, Dict
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def build_prompt(text: str) -> str:
    """
    Constructs a clean LLM prompt for extracting questions.
    """
    return f"Extract questions from the following text in the specified JSON format:\n\n{text}"

def extract_with_gpt(raw_text: str) -> List[Dict]:
    """
    Uses OpenAI GPT-4 to extract questions from raw text.
    """
    try:
        prompt = build_prompt(raw_text)
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are an intelligent assistant. Extract multiple-choice questions (MCQs) from raw exam text "
                        "and output ONLY a valid JSON array. Do not include any other text or commentary. Each question "
                        "should include: question_text, options (list), correct_option (A/B/C/D), explanation, difficulty, "
                        "bloom_level, skill_tags, keywords, topic, subject, language, estimated_time, and source_type."
                    )
                },
                {
                    "role": "user",
                    "content": f"Extract questions from the following exam text and format them as a strict JSON array of question objects. "
                               f"Do NOT include any explanation outside the JSON.\n\nTEXT:\n{raw_text}"
                }
            ],
            temperature=0.2
        )
        # Retrieve and clean the raw response
        raw_output = response.choices[0].message.content.strip()
        
        # Log the raw output for debugging
        print("\n=== RAW GPT OUTPUT ===\n", raw_output[:2000])
        
        try:
            # Attempt to parse the JSON response
            questions = json.loads(raw_output)
            return questions
        except json.JSONDecodeError as e:
            # Log the raw output for debugging
            print(f"Failed to parse JSON response. Raw output: {raw_output[:1000]}")
            raise ValueError(f"Failed to parse JSON response: {str(e)}")
    
    except Exception as e:
        raise ValueError(f"Error during GPT-4 processing: {str(e)}")

def extract_with_gemini(raw_text: str) -> List[Dict]:
    """
    Placeholder for Gemini API integration.
    """
    # To be implemented with Gemini's API
    return []

def extract_questions(raw_text: str, model: str = "gpt-4") -> List[Dict]:
    """
    Routes the text to the correct model-specific handler based on the model argument.
    """
    if model == "gpt-4":
        return extract_with_gpt(raw_text)
    elif model == "gemini":
        return extract_with_gemini(raw_text)
    else:
        raise ValueError(f"Unsupported model: {model}") 