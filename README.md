# SkillGraph Major 🚀

SkillGraph is an AI-powered project-based learning, assessment, and career verification platform. This repository contains both the frontend (Next.js) and backend (FastAPI) services.

## 🏗️ Project Architecture
- **Frontend**: Next.js 14 (App Router), React, Tailwind CSS, TypeScript
- **Backend**: FastAPI (Python), Supabase (PostgreSQL), Piston API (Code Execution)
- **AI Models**: Gemini & Llama-3 (via Groq) for dynamic assessments, JD parsing, and code evaluation.

---

## 🌟 What We've Built Till Now (Project Overview)

Our platform gamifies the learning process by using a node-based **Skill Graph**. As users prove their knowledge, they level up their skills and unlock new career opportunities.

### 1. Level 1 Assessment: Adaptive AI Evaluation
When a user clicks on a skill node to take an assessment, they face a 12-question gauntlet generated entirely on the fly by AI:
*   **Adaptive MCQs**: The first 10 questions adjust in difficulty based on whether the user gets the previous questions right or wrong.
*   **Dynamic Coding Challenges**: The final 2 questions require writing actual code. 
*   **Piston Execution Engine**: For the coding questions, we don't just rely on AI for grading. We wrap the user's code in a test script and run it *live* in a secure sandbox using the Piston API! If their code fails the test cases, the exact compiler/runtime error is piped back to them as feedback. If the language isn't supported by Piston, it safely falls back to a strict AI conceptual grading.

### 2. Level 2 Assessment: Project Verification
To reach Level 2, users must build and defend a real-world project.
*   **Idea Generation**: The AI generates a complex, highly specific project spec for the user to build based on their skill.
*   **Strict Engineering Checks**: The user submits their GitHub repository URL and writes a Project Abstract. The backend reaches out to the **GitHub API** to scan the root file tree of their repository. It explicitly checks for Software Engineering best practices (e.g., failing the submission if they committed a `.env` file or forgot a `README.md`).
*   **The Defense Interview**: If the codebase passes the structural checks, the AI acts as a Senior Engineering Manager. It reads the Abstract and the file structure to generate a tough architectural interview question. The user must defend their design decisions to prove they didn't just copy the code!

---

## 🛠️ Setup Instructions for the Team

Welcome to the team! To work on this project locally, follow these steps strictly.

### 1. Prerequisites
- **Git**
- **Node.js** (v18+)
- **Python** (v3.10+)

### 2. Clone the Repository
```bash
git clone https://github.com/jzmtx/skill-graph-major.git
cd skill-graph-major
```

### 3. Environment Variables (.env)
We use a shared database and storage for the team, but you need your own AI keys.

**Backend Setup (`backend/.env`):**
1. Navigate to the `backend` directory.
2. Make a copy of the template file and rename the copy to exactly `.env`.
   ```bash
   cp .env.example .env
   ```
3. Open `.env` in your code editor. The shared Supabase and Cloudinary keys are already populated.
4. Replace the dummy values for `GROQ_API_KEY` and `TAVILY_API_KEY` with your actual API keys (or ask the project lead for them).
5. Save the file.

**Frontend Setup (`frontend/.env.local`):**
1. Navigate to the `frontend` directory.
2. Make a copy of the template file and rename the copy to exactly `.env.local`.
   ```bash
   cp .env.example .env.local
   ```
3. Open `.env.local` and ensure the `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correct.
4. Save the file.

### 4. Start the Backend (FastAPI)
1. Open a terminal in the `backend` directory.
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   
   # Windows:
   venv\Scripts\activate
   # Mac/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the API server:
   ```bash
   uvicorn main:app --reload
   ```

### 5. Start the Frontend (Next.js)
1. Open a *new* terminal window in the `frontend` directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. The frontend will be available at `http://localhost:3000`.

---

## 🧪 Testing Guide

Once both servers are running simultaneously, open `http://localhost:3000` in your browser.

1.  **Login/Register**: Because you are connected to the shared Supabase database, any account you create will be visible to the team.
2.  **Dashboard**: After logging in, you'll be taken to the dashboard to view your interactive Skill Graph.
3.  **Test Level 1 (Adaptive AI + Piston)**: 
    *   Click on an unverified skill node.
    *   Answer the 10 adaptive MCQs.
    *   On questions 11 and 12, write Python code (e.g., `def solve(n): return n + 1`). You can click the **Run Code** button to execute it live against the Piston engine and view console output before clicking **Submit Answer**!
4.  **Test Level 2 (Project Verification)**: 
    *   Click on a skill that has already passed Level 1.
    *   Click the "L2 Verify Project" button.
    *   Generate a project idea.
    *   Try submitting a GitHub URL that doesn't have a README or has a `.env` file (e.g. one of your old repos). The AI should instantly fail you! Then try submitting a clean, proper repository to get to the interview question phase.

---

## 🌿 Git Workflow: How to Collaborate

To ensure we don't overwrite each other's work, we use **Git Branches**.

### The Golden Rule: Never work directly on `main`!
The `main` branch should always contain working, deployable code.

### 1. Working on a New Feature
When you want to add a feature, create a new branch:
```bash
git checkout -b feature/your-feature-name
```

### 2. Saving Your Work
Once you've made changes:
```bash
git add .
git commit -m "Added the awesome new feature"
git push origin feature/your-feature-name
```

### 3. Merging (Pull Requests)
Create a **Pull Request (PR)** on GitHub to merge your branch into `main`. The team will review your code. 

### 4. Deleting a Bad Branch
If you created a branch and realized it's a terrible idea, you can easily delete it and return to the stable `main` code:
```bash
git checkout main
git branch -D feature/bad-idea
```
