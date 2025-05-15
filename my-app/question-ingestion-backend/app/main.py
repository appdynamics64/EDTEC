from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.upload import router as upload_router
from app.api.chatbot import router as chatbot_router
from app.api.extract import router as extract_router
from app.api.chat_doubt import router as chat_doubt_router

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Your React app's URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the routers
app.include_router(upload_router, prefix="/api")
app.include_router(chatbot_router, prefix="/api")
app.include_router(extract_router, prefix="/api")
app.include_router(chat_doubt_router, prefix="/api")

@app.get("/")
async def root():
    return {"message": "Welcome to the AI-powered question ingestion API"} 