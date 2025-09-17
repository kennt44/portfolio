#!/bin/bash

# Deploy script for portfolio project

# Step 1: Install backend dependencies in a virtual environment
python3 -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt

# Step 2: Build frontend React app
cd frontend
npm install
npm run build
cd ..

# Step 3: Copy frontend build to backend static folder
rm -rf backend/static
mkdir -p backend/static
cp -r frontend/build/* backend/static/

# Step 4: Run backend server with Gunicorn
cd backend
gunicorn -w 4 -b 0.0.0.0:8000 app:app
