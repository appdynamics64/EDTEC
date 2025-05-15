import os
import psycopg2
from dotenv import load_dotenv
import re

# Load environment variables
load_dotenv()

def setup_match_documents_function():
    """Create the match_documents PostgreSQL function in Supabase"""
    
    # Get Supabase credentials
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
    
    if not supabase_url or not supabase_key:
        raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables are required")
    
    # Extract project ID from URL
    match = re.search(r'https://([a-zA-Z0-9-]+)\.supabase\.co', supabase_url)
    if not match:
        raise ValueError(f"Could not extract project ID from Supabase URL: {supabase_url}")
    
    project_id = match.group(1)
    
    # Construct DATABASE_URL
    # Note: This assumes default postgres user and database name
    database_url = f"postgresql://postgres:{supabase_key}@db.{project_id}.supabase.co:5432/postgres"
    
    # SQL query to create the match_documents function
    query = """
    -- Enable the vector extension
    CREATE EXTENSION IF NOT EXISTS vector;
    
    -- Create the documents table if it doesn't exist
    CREATE TABLE IF NOT EXISTS documents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      content TEXT NOT NULL,
      metadata JSONB,
      embedding VECTOR(3072)
    );
    
    -- Create the match_documents function
    CREATE OR REPLACE FUNCTION match_documents (
      query_embedding vector(3072),
      match_threshold float DEFAULT 0.5,
      match_count int DEFAULT 10
    )
    RETURNS TABLE (
      id uuid,
      content text,
      metadata jsonb,
      similarity float
    )
    LANGUAGE plpgsql
    AS $$
    BEGIN
      RETURN QUERY
      SELECT
        id,
        content,
        metadata,
        1 - (documents.embedding <=> query_embedding) AS similarity
      FROM documents
      WHERE 1 - (documents.embedding <=> query_embedding) > match_threshold
      ORDER BY similarity DESC
      LIMIT match_count;
    END;
    $$;
    """
    
    try:
        # Connect directly to the PostgreSQL database
        print(f"Connecting to database: {database_url.replace(supabase_key, '****')}")
        conn = psycopg2.connect(database_url)
        conn.autocommit = True
        with conn.cursor() as cur:
            cur.execute(query)
        
        print("Successfully created match_documents function and table in Supabase")
    except Exception as e:
        print(f"Error creating database objects: {str(e)}")
        print("\nPlease use the Supabase SQL Editor method instead.")

if __name__ == "__main__":
    setup_match_documents_function() 