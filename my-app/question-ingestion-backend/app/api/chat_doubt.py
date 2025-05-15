from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
import os
from dotenv import load_dotenv
import json

# LangChain imports
from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.documents import Document
from supabase.client import create_client
from langchain_community.vectorstores import SupabaseVectorStore

# Load environment variables
load_dotenv()

# Get API key from environment variables
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise ValueError("OPENAI_API_KEY not found in environment variables")

router = APIRouter()

# Define request model
class DoubtRequest(BaseModel):
    query: str

# Define response model
class DoubtResponse(BaseModel):
    answer: str

# Dummy document chunks for SSC CGL exam
SSC_CGL_CHUNKS = [
    Document(
        page_content="The Staff Selection Commission - Combined Graduate Level (SSC CGL) exam is conducted for recruitment to various Group B and Group C posts. The exam consists of four tiers: Tier I (Computer Based Examination), Tier II (Computer Based Examination), Tier III (Pen and Paper Mode), and Tier IV (Computer Proficiency Test/ Data Entry Skill Test).",
        metadata={"source": "SSC CGL Overview", "topic": "exam_structure"}
    ),
    Document(
        page_content="Tier I of SSC CGL includes sections on General Intelligence and Reasoning, General Awareness, Quantitative Aptitude, and English Comprehension. Each section has 25 questions worth 50 marks, making a total of 100 questions worth 200 marks. The time duration is 60 minutes.",
        metadata={"source": "SSC CGL Syllabus", "topic": "tier_i_syllabus"}
    ),
    Document(
        page_content="Tier II of SSC CGL includes papers on Quantitative Abilities, English Language and Comprehension, Statistics, and General Studies (Finance & Economics). Papers I and II are compulsory for all posts, while Papers III and IV are for specific posts. Each paper has 100 questions worth 200 marks.",
        metadata={"source": "SSC CGL Syllabus", "topic": "tier_ii_syllabus"}
    ),
    Document(
        page_content="For Quantitative Aptitude in SSC CGL, important topics include: Number Systems, Percentage, Ratio & Proportion, Average, Interest, Profit and Loss, Discount, Mixture and Alligation, Time and Work, Time and Distance, Mensuration, Algebra, Geometry and Trigonometry, Data Interpretation.",
        metadata={"source": "SSC CGL Preparation Guide", "topic": "quant_topics"}
    ),
    Document(
        page_content="For General Intelligence and Reasoning in SSC CGL, focus on: Analogies, Similarities and Differences, Spatial Visualization, Spatial Orientation, Visual Memory, Discrimination, Observation, Relationship Concepts, Arithmetical Reasoning, Verbal and Figure Classification, Arithmetical Number Series, Non-verbal Series, Coding and Decoding, Statement Conclusion, Syllogistic Reasoning.",
        metadata={"source": "SSC CGL Preparation Guide", "topic": "reasoning_topics"}
    ),
    Document(
        page_content="The English Comprehension section in SSC CGL tests: Reading Comprehension, Cloze Test, Para Jumbles, Sentence Correction, Fill in the Blanks, Synonyms, Antonyms, Spelling/Detecting Misspelled Words, Idioms & Phrases, One Word Substitution, Improvement of Sentences, Active/Passive Voice, Direct/Indirect Narration.",
        metadata={"source": "SSC CGL Preparation Guide", "topic": "english_topics"}
    ),
    Document(
        page_content="General Awareness for SSC CGL covers: Current Affairs, India and its neighboring countries, Sports, History, Culture, Geography, Economic Scene, General Polity, Indian Constitution, and Scientific Research. Focus on events of national and international importance that have occurred in the last 12 months.",
        metadata={"source": "SSC CGL Preparation Guide", "topic": "ga_topics"}
    ),
    Document(
        page_content="The eligibility criteria for SSC CGL include: Candidates must be a citizen of India, Age limit varies from 18-32 years (with relaxation for reserved categories), Educational qualification: Bachelor's Degree from a recognized University or equivalent.",
        metadata={"source": "SSC CGL Eligibility", "topic": "eligibility"}
    ),
]

# Initialize Supabase client
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
supabase = create_client(supabase_url, supabase_key)

def get_vector_store():
    """Get a vector store client with better error handling"""
    embeddings = OpenAIEmbeddings(model="text-embedding-3-large")
    
    # Check if we should use real data or dummy data
    use_real_data = os.getenv("USE_REAL_DATA", "false").lower() == "true"
    
    if use_real_data:
        try:
            print("Attempting to use Supabase pgvector...")
            # Use Supabase pgvector
            vector_store = SupabaseVectorStore(
                client=supabase,
                embedding=embeddings,
                table_name="documents",
                query_name="match_documents"
            )
            
            # Test if it works by checking document count
            try:
                result = supabase.table("documents").select("id", count="exact").execute()
                doc_count = result.count if hasattr(result, 'count') else 0
                print(f"Found {doc_count} documents in Supabase")
                
                if doc_count == 0:
                    print("WARNING: No documents found in Supabase, falling back to dummy data")
                    return FAISS.from_documents(documents=SSC_CGL_CHUNKS, embedding=embeddings)
                
            except Exception as e:
                print(f"Error checking document count: {str(e)}")
                
            return vector_store
        except Exception as e:
            print(f"Error initializing Supabase vector store: {str(e)}")
            print("Falling back to dummy data")
            return FAISS.from_documents(documents=SSC_CGL_CHUNKS, embedding=embeddings)
    else:
        # Use dummy data with FAISS for development/testing
        print("WARNING: Using dummy data for development. Set USE_REAL_DATA=true to use Supabase.")
        return FAISS.from_documents(documents=SSC_CGL_CHUNKS, embedding=embeddings)

# Define the prompt template
RAG_PROMPT_TEMPLATE = """You are an expert SSC CGL exam tutor. Use the following information from SSC CGL study materials to answer the student's question.

Context information:
{context}

Student's question: {question}

Please provide a detailed, accurate answer based on the context information. If the context doesn't contain enough information to answer the question completely, clearly state what information is missing and provide the best answer you can with the available information. Include relevant examples and explanations where appropriate.
"""

# Create the chat prompt
def get_prompt():
    return ChatPromptTemplate.from_template(RAG_PROMPT_TEMPLATE)

@router.post("/chat/doubt", response_model=DoubtResponse)
async def answer_doubt(request: DoubtRequest):
    """
    Endpoint to answer student doubts about SSC CGL exam using RAG.
    """
    try:
        query = request.query
        print(f"\n--- RAG Query: {query} ---")
        
        # Get vector store (real or dummy)
        vector_store = get_vector_store()
        
        # Retrieve relevant documents (top 3)
        retrieved_docs = vector_store.similarity_search(query, k=3)
        
        # Print retrieved documents for debugging
        print(f"\nRetrieved {len(retrieved_docs)} documents:")
        for i, doc in enumerate(retrieved_docs):
            source = doc.metadata.get("source", "Unknown")
            topic = doc.metadata.get("topic", "Unknown")
            print(f"\nDocument {i+1} - {source} - {topic}")
            print(f"Content: {doc.page_content[:100]}...")  # Print first 100 chars
            
        # Format context from retrieved documents
        context_texts = []
        for i, doc in enumerate(retrieved_docs):
            source = doc.metadata.get("source", "Unknown")
            topic = doc.metadata.get("topic", "Unknown")
            context_texts.append(f"[Document {i+1} - {source} - {topic}]\n{doc.page_content}")
        
        context = "\n\n".join(context_texts)
        
        # Debug: Check if we're using real data or dummy data
        using_supabase = os.getenv("USE_REAL_DATA", "false").lower() == "true"
        print(f"\nUsing Supabase for retrieval: {using_supabase}")
        
        # Generate answer using OpenAI
        llm = ChatOpenAI(model="gpt-4-turbo", temperature=0.1)
        prompt = get_prompt()
        
        chain = prompt | llm
        response = chain.invoke({"context": context, "question": query})
        
        # Extract the answer from the response
        answer = response.content
        print(f"\nGenerated answer (first 100 chars): {answer[:100]}...")
        
        return DoubtResponse(answer=answer)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing request: {str(e)}")

@router.get("/chat/doubt/diagnostic")
async def diagnose_retrieval():
    """Diagnostic endpoint to check if Supabase retrieval is working"""
    try:
        # Check if we're using real data
        use_real_data = os.getenv("USE_REAL_DATA", "false").lower() == "true"
        
        # Initialize the embeddings model
        embeddings = OpenAIEmbeddings(model="text-embedding-3-large")
        
        if use_real_data:
            # Check Supabase connection
            try:
                # Get document count from Supabase
                result = supabase.table("documents").select("id", count="exact").execute()
                document_count = result.count if hasattr(result, 'count') else 0
                
                # Test vector retrieval with a simple query
                test_query = "SSC CGL exam structure"
                vector_store = SupabaseVectorStore(
                    client=supabase,
                    embedding=embeddings,
                    table_name="documents",
                    query_name="match_documents"
                )
                
                retrieved = vector_store.similarity_search(test_query, k=1)
                retrieval_working = len(retrieved) > 0
                
                return {
                    "status": "success",
                    "using_real_data": True,
                    "document_count": document_count,
                    "retrieval_working": retrieval_working,
                    "retrieved_sample": retrieved[0].page_content[:100] + "..." if retrieval_working else None
                }
            except Exception as e:
                return {
                    "status": "error",
                    "using_real_data": True,
                    "error": str(e),
                    "fallback_to_dummy": True
                }
        else:
            # Using dummy data
            return {
                "status": "success", 
                "using_real_data": False,
                "document_count": len(SSC_CGL_CHUNKS),
                "message": "Using dummy data (FAISS with hardcoded documents)"
            }
            
    except Exception as e:
        return {"status": "error", "message": str(e)} 