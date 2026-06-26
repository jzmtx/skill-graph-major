# SkillGraph Major 🚀

SkillGraph is an AI-powered project-based learning and verification platform. This repository contains both the frontend (Next.js) and backend (FastAPI) services.

## Project Architecture

- **Frontend**: Next.js 14 (App Router), React, Tailwind CSS, TypeScript
- **Backend**: FastAPI (Python), Supabase (PostgreSQL), Gemini/Llama AI Integration

---

## 🛠️ Setup Instructions for the Team

Welcome to the team! To work on this project locally, follow these steps strictly.

### 1. Prerequisites
- **Node.js** (v18+)
- **Python** (v3.10+)
- **Supabase Account** (for database credentials)
- **Groq/Gemini API Keys** (for AI LLM access)

### 2. Frontend Setup (Next.js)
1. Open a terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. The frontend will be available at `http://localhost:3000`.

### 3. Backend Setup (FastAPI)
1. Open a new terminal and navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   
   # Windows:
   venv\Scripts\activate
   # Mac/Linux:
   source venv/bin/activate
   ```
3. Install the Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the API server:
   ```bash
   uvicorn main:app --reload
   ```
5. The API will be available at `http://127.0.0.1:8000`.

### 4. Environment Variables (.env)
Since this is a private repository for our team, here are the actual environment variables you need to run the project.

**Backend Setup (`backend/.env`):**
1. Navigate to the `backend` directory.
2. Create a new file named exactly `.env`.
3. Open `.env` in your code editor and paste the following exactly as is:
```env
# Supabase (Database & Auth)
SUPABASE_URL=https://nueopmjkktlyudnmecmz.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51ZW9wbWpra3RseXVkbm1lY216Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjI5MzIwMiwiZXhwIjoyMDk3ODY5MjAyfQ.C5g0z7Hx4laWblNJLbRmRslyR9j2NzT6pt9_cWSq6fY
DATABASE_URL=postgresql://postgres:Skillgraph@123@db.nueopmjkktlyudnmecmz.supabase.co:5432/postgres

# Groq (AI Model for JD parsing & Interviews)
GROQ_API_KEY=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

# Cloudinary (File Storage)
CLOUDINARY_CLOUD_NAME=djjmaj5dy
CLOUDINARY_API_KEY=261453169686886
CLOUDINARY_API_SECRET=sBBKaWXz_GH6fimHGNjGF21clzI

# Tavily (Career Search)
TAVILY_API_KEY=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
```
4. Save the file. The FastAPI server will automatically pick these up when you run `uvicorn`.

**Frontend Setup (`frontend/.env.local`):**
1. Navigate to the `frontend` directory.
2. Create a new file named exactly `.env.local`.
3. Paste the following:
```env
# Supabase (Database & Auth - Required by Frontend for client-side Auth if needed)
NEXT_PUBLIC_SUPABASE_URL=https://nueopmjkktlyudnmecmz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_qWbykuolXvKyJsSqEXlTDA_PCxb8aYt

# Backend API URL (for local development)
NEXT_PUBLIC_API_URL=http://localhost:8000
```
4. Save the file. When you run `npm run dev`, Next.js will load these automatically.

---

## 🌐 Using the Web App Locally

Once you have both the frontend (Next.js) and backend (FastAPI) servers running simultaneously in separate terminal windows:

1. Open your web browser and go to `http://localhost:3000`.
2. **Login/Register:** You can register a new account or log in. Because you are connected to the shared Supabase database, any account you create will be visible to the whole team, and you'll see any data we've already generated!
3. **Dashboard:** After logging in, you'll be taken to the dashboard where you can see your skill graph.
4. **Assessment & Verification:** Click on a node in the skill graph to take an AI-powered assessment. For Level 2 skills, you can submit a GitHub URL for the AI to analyze and generate interview questions!
5. **Resume & Jobs:** Use the sidebar to upload a resume or search for jobs based on your verified skills.

---

## 🌿 Git Workflow: How to Collaborate Without Breaking Things

To ensure we don't overwrite each other's work, we use **Git Branches**.

### The Golden Rule: Never work directly on `main`!
The `main` branch should always contain working, deployable code.

### 1. Working on a New Feature
When you want to add a feature (like a new UI button, or a new API endpoint), create a new branch:
```bash
git checkout -b feature/your-feature-name
```
Now, you can write your code safely!

### 2. Saving Your Work
Once you've made changes:
```bash
git add .
git commit -m "Added the awesome new feature"
git push origin feature/your-feature-name
```

### 3. Merging (Pull Requests)
Once your feature is done, you create a **Pull Request (PR)** on GitHub to merge your branch into `main`. The team will review your code. If it looks good, it gets merged!

### 4. What if you don't like the feature?
If you created a branch, did some work, and realized it's a terrible idea, you can easily delete it and return to the stable `main` code:
```bash
# Go back to the safe main branch
git checkout main

# Delete your bad branch (Warning: This deletes your unmerged work!)
git branch -D feature/bad-idea
```

### 5. Keeping Your Code Updated
If someone else merges a feature into `main`, your local `main` needs to grab those updates:
```bash
git checkout main
git pull origin main
```
