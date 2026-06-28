# SkillGraph AI

SkillGraph AI is an intelligent, live-market-driven career mapping platform. It moves away from static, outdated roadmaps by actively scraping current job boards (LinkedIn, Indeed, Glassdoor) via JobSpy, extracting exactly what employers are asking for using high-speed NLP (Aho-Corasick), and orchestrating a LLaMa-3 70B AI to generate logical, sequential learning paths.

## End-to-End Journey (What We Built)

1. **Live Market Intelligence**: We built a Python backend that takes a user's desired Role (e.g. Full Stack Developer) and Ecosystem (e.g. MERN). It triggers JobSpy to scrape ~50 live job descriptions across the internet.
2. **Advanced NLP Skill Extraction**: The raw text from these Job Descriptions is run through a custom Aho-Corasick NLP engine against our massive database of thousands of tech skills. It calculates precise demand percentages (e.g., React: 85%, Docker: 42%).
3. **Ontology & Framework Mapping**: The system detects Parent-Child relationships. If it sees "Python" is in demand, it automatically pulls data for specific frameworks like Django and FastAPI so the user isn't left guessing.
4. **LLaMa-3 Generation Engine**: We feed the hard data into a strictly prompted Groq LLaMa-3 70B model. The AI is forbidden from hallucinating skills. It sequentially orders the data into Foundations ➔ Frameworks ➔ Databases ➔ Cloud, providing a structured, interactive roadmap.
5. **Interactive UI & RAG Chat**: The Next.js frontend renders this roadmap in a dynamic canvas. We also built an AI Assistant that can read your specific roadmap and answer questions about why certain technologies were chosen over others.

## Setup Instructions

### 1. Clone the Repository
```bash
git clone <repository_url>
cd skillgraph
```

### 2. Backend Setup (FastAPI / Python)
```bash
cd backend

# Create a virtual environment (optional but recommended)
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

**Required `.env` file in `/backend`:**
Create a `.env` file in the `backend` folder with the following keys:
```env
# Supabase (Database & Auth)
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_service_role_key
DATABASE_URL=your_postgres_connection_string

# Groq (AI Model for Roadmaps & Chat)
GROQ_API_KEY=your_groq_api_key

# Cloudinary (File Storage)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Tavily (Career Search / Fallback)
TAVILY_API_KEY=your_tavily_key

# Job Search APIs
SERPER_API_KEY=your_serper_key
JSEARCH_API_KEY=your_jsearch_key
```

**Run the Backend:**
```bash
uvicorn main:app --reload
```
The backend will run on `http://localhost:8000`.

### 3. Frontend Setup (Next.js / React)
```bash
cd ../frontend

# Install dependencies
npm install
```

**Required `.env.local` file in `/frontend`:**
Create a `.env.local` file in the `frontend` folder with the following keys:
```env
# Supabase (Database & Auth)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Backend API URL (for local development)
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**Run the Frontend:**
```bash
npm run dev
```
The frontend will run on `http://localhost:3000`.

## Architecture Highlights
- **FastAPI**: Chosen for its high speed, asynchronous capabilities, and excellent integration with Python ML/NLP libraries.
- **Next.js**: Chosen for SEO, fast rendering, and dynamic routing for user dashboards.
- **Supabase**: Handles all Postgres relational data, JSONB storage for roadmap schemas, and Row Level Security.
- **Groq**: Provides ultra-fast inference for the massive LLaMa-3 70B model, crucial for quick generation wait times.
