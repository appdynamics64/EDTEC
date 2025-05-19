# Deployment Guide for SSC CGL Backend

This guide explains how to deploy the SSC CGL question backend to Render.

## Prerequisites

1. A Render account (https://render.com)
2. A GitHub repository with your code
3. An OpenAI API key
4. A Supabase project

## Steps to Deploy

### 1. Push Your Code to GitHub

Make sure your code is in a GitHub repository.

### 2. Create a New Web Service on Render

1. Log in to your Render dashboard
2. Click on "New" and select "Web Service"
3. Connect your GitHub repository
4. Select the repository and branch containing your code

### 3. Configure the Web Service

Fill in the following details:
- **Name**: `ssc-cgl-backend` (or your preferred name)
- **Root Directory**: `question-ingestion-backend` (if your code is in a subdirectory)
- **Environment**: Python
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### 4. Set Environment Variables

Add the following environment variables:
- `OPENAI_API_KEY`: Your OpenAI API key
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_KEY`: Your Supabase service key
- `USE_REAL_DATA`: Set to `true`
- `ALLOWED_ORIGINS`: Comma-separated list of allowed origins (e.g., `https://your-frontend.vercel.app,http://localhost:3000`)

### 5. Deploy the Service

Click "Create Web Service" to start the deployment.

### 6. Update Your Frontend Configuration

Update your frontend application with the new backend URL:
- Set `REACT_APP_API_URL` to your Render service URL (e.g., `https://ssc-cgl-backend.onrender.com`)

### 7. Test the Deployment

Once deployed, test your endpoints:
- Health check: `https://your-service-url/api/health`
- Test a doubt query: `https://your-service-url/api/chat/doubt`

## Troubleshooting

If you encounter issues:
1. Check the Render logs in the Render dashboard
2. Verify your environment variables are set correctly
3. Ensure your Supabase database is properly configured
4. Check CORS configuration if you're getting cross-origin errors 