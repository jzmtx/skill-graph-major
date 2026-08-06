from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

# We will import our routers here
from routes import auth, colleges, skills, assessment, project, admin, roadmaps, resources

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


