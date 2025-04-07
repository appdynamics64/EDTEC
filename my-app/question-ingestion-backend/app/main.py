from fastapi import FastAPI
from app.api.upload import router as upload_router
from app.api.chatbot import router as chatbot_router

app = FastAPI()

# Include the upload and chatbot routers
app.include_router(upload_router, prefix="/api")
app.include_router(chatbot_router, prefix="/api")

@app.get("/")
async def root():
    return {"message": "Welcome to the AI-powered question ingestion API"} 