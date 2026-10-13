from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv
import asyncio

# We will import our routers here
from routes import auth, colleges, skills, assessment, project, admin, roadmaps, resources, company, jobs, tpo, alumni, upload, opensource, communications
import database

load_dotenv()

app = FastAPI(title="SkillGraph API", version="1.0.0")

# Setup CORS for the Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
async def periodic_refresh():
    """Refreshes the Supabase client every few minutes to prevent stale connections."""
    while True:
        await asyncio.sleep(240)  # 4 minutes
        database.refresh_supabase()
        print("[SUPABASE] client refreshed (periodic)")

@app.on_event("startup")
async def startup_event():
    """Refresh the Supabase client on startup to clear any stale JWT sessions."""
    database.refresh_supabase()
    print("[OK] Supabase client refreshed on startup")
    asyncio.create_task(periodic_refresh())

@app.get("/")
def health_check():
    return {"status": "ok", "message": "SkillGraph API is running"}


app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(colleges.router, prefix="/api/colleges", tags=["Colleges"])
app.include_router(skills.router, prefix="/api/skills", tags=["Skills"])
app.include_router(assessment.router, prefix="/api/assessment", tags=["assessment"])
app.include_router(project.router, prefix="/api/project", tags=["Project"])
app.include_router(roadmaps.router, prefix="/api/roadmaps", tags=["Roadmaps"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(resources.router, prefix="/api/resources", tags=["Resources"])

app.include_router(company.router, prefix="/api/company", tags=["Company"])
app.include_router(jobs.router, prefix="/api/jobs", tags=["Jobs"])
app.include_router(tpo.router, prefix="/api/tpo", tags=["TPO"])
app.include_router(alumni.router, prefix="/api/alumni", tags=["Alumni"])
app.include_router(opensource.router, prefix="/api/opensource", tags=["Open Source"])
app.include_router(communications.router, prefix="/api/communications", tags=["Communications"])

app.include_router(upload.router, prefix="/api/upload", tags=["Upload"])
# Uvicorn reload trigger: company eligibility & ATS screening