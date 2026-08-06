# Developer Onboarding & API Configuration Guide

Welcome to the **NextEngineer** development team! This guide details how to install prerequisite software, clone the project, obtain the necessary API keys, set up local environment variables, and run both frontend and backend systems.

---

## 👥 Shared Database Architecture
*   **Yes, you both can and should use the same Supabase instance.** Since Supabase is cloud-hosted, configuring both of your local `.env` files with the same credentials connects you to the same remote database instance. This keeps job statistics, profiles, and cached roadmaps synchronized.

---

## 🛠️ Required Software Installations

Before getting started, ensure you have the following installed on your machine:
1.  **Git:** [Download Git](https://git-scm.com/downloads) (Used to clone and manage code version control).
2.  **Node.js (v18 or higher):** [Download Node.js](https://nodejs.org/) (Required for running the Next.js frontend).
3.  **Python (3.10 to 3.12):** [Download Python](https://www.python.org/downloads/) (Required for running the FastAPI backend).
4.  **VS Code (Recommended):** [Download VS Code](https://code.visualstudio.com/) (IDE).

---

## 🚀 Cloning & Local Development Setup

### Step 1: Clone the Codebase
Open your terminal (PowerShell, Command Prompt, or Bash) and run:
```bash
git clone <repository_url>
cd skillgraph
```

### Step 2: Backend Configuration (FastAPI)
1.  Navigate into the `backend` folder:
    ```bash
    cd backend
    ```
2.  Create a virtual environment:
    ```bash
    python -m venv venv
    ```
3.  Activate the virtual environment:
    *   **Windows (PowerShell):** `.\venv\Scripts\activate`
    *   **Windows (CMD):** `.\venv\Scripts\activate.bat`
    *   **macOS / Linux:** `source venv/bin/activate`
4.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
5.  Create a file named `.env` in the root of the `/backend` folder. See the **API Key Credentials** section below for how to fill this file.
6.  Start the FastAPI backend:
    ```bash
    uvicorn main:app --reload
    ```

### Step 3: Frontend Configuration (Next.js)
1.  Open a new terminal window, and navigate into the `frontend` folder:
    ```bash
    cd frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Create a file named `.env.local` in the root of the `/frontend` folder and add:
    ```env
    NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
    ```
4.  Start the Next.js development server:
    ```bash
    npm run dev
    ```

---

## 🔑 Environment Variables & API Key Credentials

Create a `.env` file inside the `backend/` directory with the following structure:

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your-anon-or-service-role-key
TAVILY_API_KEY=tvly-your-api-key
GROQ_API_KEYS=gsk_key1,gsk_key2
APIFY_API_TOKEN=apify_api_token_here
```

### How to Get These API Keys:

#### 1. Supabase credentials (`SUPABASE_URL` & `SUPABASE_KEY`)
*   **Step 1:** Go to [Supabase](https://supabase.com) and log in.
*   **Step 2:** Click on your project dashboard.
*   **Step 3:** Go to **Project Settings** (cog icon on bottom-left sidebar) $\rightarrow$ **API**.
*   **Step 4:** Copy the **Project URL** and paste it as `SUPABASE_URL`.
*   **Step 5:** Copy the **`anon public`** key (or the `service_role` key if performing administrative database seeding scripts) and paste it as `SUPABASE_KEY`.

#### 2. Tavily API Key (`TAVILY_API_KEY`)
*   **Step 1:** Sign up or log in at [Tavily AI](https://tavily.com).
*   **Step 2:** Go to your dashboard page.
*   **Step 3:** Click **Create API Key** (or copy the default key provided on your dashboard screen).
*   **Step 4:** Paste this key as `TAVILY_API_KEY`. (Used for fallback web search queries).

#### 3. Groq API Keys (`GROQ_API_KEYS`)
*   **Step 1:** Go to [Groq Console](https://console.groq.com) and register an account.
*   **Step 2:** On the left sidebar, click **API Keys**.
*   **Step 3:** Click **Create API Key**, name it (e.g. `NextEngineer-Key`), and copy it.
*   *Tip:* Because Groq enforces rate limits on free models, you can paste multiple keys separated by commas (e.g. `gsk_key1,gsk_key2`) to enable automatic API key rotation!

#### 4. Apify API Token (`APIFY_API_TOKEN`)
*   **Step 1:** Go to [Apify Console](https://console.apify.com) and sign up.
*   **Step 2:** Click on **Settings** (bottom-left) $\rightarrow$ **Integrations**.
*   **Step 3:** Copy the **Personal API Token**.
*   **Step 4:** Paste this as `APIFY_API_TOKEN` to enable background LinkedIn scraping workers.

---

## 🔌 API Usage: What They Do & How They Work

Here is the operational breakdown of how our external APIs and libraries drive NextEngineer:

### 1. Supabase API (Cloud Database)
*   **What it does:** Acts as our persistent storage engine. It holds the core skills graph, dependency edges, user saved roadmaps, scraped job post details, analytics data, and assessment databases.
*   **How it works:**
    *   The backend initializes a database connection using the `supabase-py` SDK (`backend/database.py`).
    *   Whenever a client requests a roadmap, we check the cache: `supabase.table("career_paths").select("*").eq("role_name", name).execute()`.
    *   It operates over standard REST/PostgreSQL queries, securing tables using Row Level Security (RLS) policies.

### 2. Groq LLM API (Llama-3.1-8b-instant)
*   **What it does:** Drives all semantic AI actions including parsing job details, translating abstract concepts to concrete tools, generating projects, subskills, and hands-on labs.
*   **How it works:**
    *   We send structured text prompts specifying exactly what output format is required.
    *   To guarantee safety and prevent parsing crashes, we set `response_format={"type": "json_object"}` in our API calls.
    *   We load multiple API keys into the `GROQ_API_KEYS` list. Every API call randomly rotates these keys to bypass token-per-minute (TPM) and request-per-minute (RPM) rate limits.

### 3. Tavily Search API (Conceptual Fallback)
*   **What it does:** Provides web search intelligence. If a user queries a niche career path that has zero job postings on LinkedIn, Tavily crawls Wikipedia, and documentation pages for that role.
*   **How it works:**
    *   We make a POST request to `https://api.tavily.com/search` passing a query such as: *"top technologies and libraries for [Career Name]"*.
    *   Tavily returns a summarized text list of the top articles.
    *   We pass this text back to the Groq LLM to parse out the verified technologies, seeding the graph dynamically.

### 4. Apify API (Scraping Proxy)
*   **What it does:** Scrapes LinkedIn Jobs and Indeed without hitting IP blocks or requiring browser setup.
*   **How it works:**
    *   We invoke pre-built cloud scrapers using Apify's API token.
    *   It returns raw job posts in JSON format, which we then extract skill frequencies from.

### 5. JobSpy Library (Inline Local Scraping)
*   **What it does:** Performed directly inside Python to scrape active job listings from LinkedIn, Indeed, Glassdoor, and Google Careers in India.
*   **How it works:**
    *   Uses rotated user-agents and HTTP requests to pull job listings concurrently.
    *   Provides fallback data when the Apify cloud workers are offline or limits are exhausted.

---

## 📁 Directory Structure & File Map

```
skillgraph/
├── backend/                  # FastAPI Application
│   ├── routes/               # API Router Endpoints
│   │   ├── admin.py          # Admin prediction & approval endpoints
│   │   ├── roadmaps.py       # Generation pipeline & status tracking
│   │   └── assessment.py     # Skill assessment API
│   ├── services/             # Core Logic Engines
│   │   ├── roadmap_engine.py # Phase partitioning, LLM prompts & overlays
│   │   ├── industry_engine.py# JobSpy scraping & frequency extraction
│   │   ├── normalization.py  # Skill ontology mapping & concept resolution
│   │   └── link_prediction.py# NetworkX Adamic-Adar link prediction service
│   ├── main.py               # Uvicorn entrypoint
│   └── database.py           # Supabase client instantiation
│
├── frontend/                 # Next.js Application
│   ├── src/
│   │   ├── app/              # Next.js App Router Pages
│   │   │   ├── admin/        # Admin panel route
│   │   │   ├── dashboard/    # Student dashboard, workspace, & roadmaps
│   │   │   └── layout.tsx    # App root shell
│   │   ├── components/       # Reusable UI components
│   │   │   ├── roadmap/      # Roadmap canvas & detail drawers
│   │   │   └── dashboard/    # Hireability score cards & profiles
│   │   └── lib/              # API Axios clients (api.ts, roadmapsApi.ts)
```

---

## 🗺️ Page & Feature Directory Guides

Here is where to work on the upcoming feature modules:

### 1. Recruiter Pages
*   **Purpose:** Allow recruiters to view top-scoring students, search for candidates by validated skills, and manage job openings.
*   **Where to work:**
    *   **Frontend:** Create a new page folder at `frontend/src/app/recruiter/page.tsx` containing the recruiter dashboard, and candidate search views.
    *   **Backend:** Create a new API router file at `backend/routes/recruiter.py` and register it in `backend/main.py`.

### 2. Alumni Pages
*   **Purpose:** Connect students with alumni who completed similar roadmaps or are currently working in target MNCs.
*   **Where to work:**
    *   **Frontend:** Create a new page folder at `frontend/src/app/dashboard/alumni/page.tsx` showing mentor cards and contact options.
    *   **Backend:** Create a router file at `backend/routes/alumni.py`.

### 3. Open Source Projects Portal
*   **Purpose:** Match student roadmaps with open-source project issues that use the technologies they are currently learning.
*   **Where to work:**
    *   **Frontend:** Add a page at `frontend/src/app/dashboard/projects/page.tsx`.
    *   **Backend:** Fetch issues via GitHub API inside `backend/routes/projects.py`.
