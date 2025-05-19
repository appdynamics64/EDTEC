from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
import time
from app.api.upload import router as upload_router
from app.api.chatbot import router as chatbot_router
from app.api.extract import router as extract_router
from app.api.chat_doubt import router as chat_doubt_router
from app.utils.logging_config import logger

app = FastAPI()

# Get allowed origins from environment variable or use defaults
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,https://edtec-5ctehyubc-app-dynamics-projects.vercel.app")
origins = allowed_origins.split(",")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # Allow requests from these origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Middleware for request logging
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    
    # Get client IP and requested path
    client_host = request.client.host if request.client else "unknown"
    path = request.url.path
    
    logger.info(f"Request started: {request.method} {path} from {client_host}")
    
    try:
        response = await call_next(request)
        
        # Calculate processing time
        process_time = time.time() - start_time
        logger.info(f"Request completed: {request.method} {path} - Status: {response.status_code} - Time: {process_time:.4f}s")
        
        return response
    except Exception as e:
        logger.error(f"Request failed: {request.method} {path} - Error: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error", "error": str(e)}
        )

# Include the routers
app.include_router(upload_router, prefix="/api")
app.include_router(chatbot_router, prefix="/api")
app.include_router(extract_router, prefix="/api")
app.include_router(chat_doubt_router, prefix="/api")

@app.get("/")
async def root():
    return {"message": "Welcome to the AI-powered question ingestion API"}

@app.get("/api/health")
async def health_check():
    """Health check endpoint for monitoring"""
    return {"status": "healthy"} 