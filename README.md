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
We use a shared database and storage for the team, but you need your own AI keys.

**Backend Setup (`backend/.env`):**
1. Navigate to the `backend` directory.
2. You will see a file named `.env.example`. Make a copy of it and rename the copy to exactly `.env`.
   ```bash
   cp .env.example .env
   ```
3. Open `.env` in your code editor. The shared Supabase and Cloudinary keys are already populated.
4. Replace the dummy values for `GROQ_API_KEY` and `TAVILY_API_KEY` with your actual API keys (or ask the project lead for them).
5. Save the file. The FastAPI server will automatically pick these up when you run `uvicorn`.

**Frontend Setup (`frontend/.env.local`):**
1. Navigate to the `frontend` directory.
2. You will see a file named `.env.example`. Make a copy of it and rename the copy to exactly `.env.local`.
   ```bash
   cp .env.example .env.local
   ```
3. Open `.env.local` and ensure the `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correct.
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
