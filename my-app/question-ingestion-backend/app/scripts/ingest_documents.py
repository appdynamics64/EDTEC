import os
from dotenv import load_dotenv
from langchain_openai import OpenAIEmbeddings
from langchain_community.document_loaders import TextLoader, DirectoryLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import SupabaseVectorStore
from supabase.client import create_client

# Load environment variables
load_dotenv()

# Initialize Supabase client
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
supabase = create_client(supabase_url, supabase_key)

# Initialize OpenAI embeddings
embeddings = OpenAIEmbeddings(model="text-embedding-3-large")

def ingest_documents(directory_path):
    """Ingest documents from a directory into Supabase pgvector"""
    
    # Check if directory exists
    if not os.path.exists(directory_path):
        print(f"ERROR: Directory {directory_path} does not exist!")
        print("Creating directory structure...")
        os.makedirs(directory_path, exist_ok=True)
        
        # Create a sample document if none exists
        sample_path = os.path.join(directory_path, "ssc_cgl_overview.txt")
        if not os.path.exists(sample_path):
            print("Creating sample document...")
            with open(sample_path, "w") as f:
                f.write("""The Staff Selection Commission - Combined Graduate Level (SSC CGL) exam is conducted for recruitment to various Group B and Group C posts. The exam consists of four tiers: Tier I (Computer Based Examination), Tier II (Computer Based Examination), Tier III (Pen and Paper Mode), and Tier IV (Computer Proficiency Test/ Data Entry Skill Test).

Tier I of SSC CGL includes sections on General Intelligence and Reasoning, General Awareness, Quantitative Aptitude, and English Comprehension. Each section has 25 questions worth 50 marks, making a total of 100 questions worth 200 marks. The time duration is 60 minutes.

For Quantitative Aptitude in SSC CGL, important topics include: Number Systems, Percentage, Ratio & Proportion, Average, Interest, Profit and Loss, Discount, Mixture and Alligation, Time and Work, Time and Distance, Mensuration, Algebra, Geometry and Trigonometry, Data Interpretation.""")
    
    # List files in directory
    files = os.listdir(directory_path)
    print(f"Found {len(files)} files in {directory_path}: {files}")
    
    # Load documents from directory
    try:
        loader = DirectoryLoader(
            directory_path, 
            glob="**/*.txt", 
            loader_cls=TextLoader
        )
        documents = loader.load()
        print(f"Loaded {len(documents)} documents")
        
        if len(documents) == 0:
            print("ERROR: No documents were loaded. Check if there are .txt files in the directory.")
            return 0
        
        # Split documents into chunks
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=500,
            chunk_overlap=50
        )
        chunks = text_splitter.split_documents(documents)
        print(f"Split into {len(chunks)} chunks")
        
        # Check the first chunk to make sure it has content
        if chunks:
            print(f"First chunk preview: {chunks[0].page_content[:100]}...")
            print(f"First chunk metadata: {chunks[0].metadata}")
        
        # Store document chunks and embeddings in Supabase
        vector_store = SupabaseVectorStore.from_documents(
            documents=chunks,
            embedding=embeddings,
            client=supabase,
            table_name="documents",
            query_name="match_documents"
        )
        
        print(f"Successfully ingested {len(chunks)} document chunks into Supabase")
        
        # Verify ingestion worked by doing a test query
        print("\nVerifying ingestion with a test query...")
        try:
            results = vector_store.similarity_search("SSC CGL syllabus", k=1)
            if results:
                print(f"✅ Test query successful! Found: {results[0].page_content[:100]}...")
            else:
                print("❌ Test query returned no results even though documents were ingested.")
        except Exception as e:
            print(f"❌ Test query failed with error: {str(e)}")
        
        return len(chunks)
    
    except Exception as e:
        print(f"ERROR during document ingestion: {str(e)}")
        raise

if __name__ == "__main__":
    # Replace with the path to your documents
    ingest_documents("./data/ssc_cgl_materials") 