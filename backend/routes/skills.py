from fastapi import APIRouter, HTTPException
from database import supabase
from models import GitHubExtractRequest
import urllib.request
import json
import re

router = APIRouter()

def extract_github_username(url: str) -> str:
    # Handles trailing slashes or extra paths
    match = re.search(r'github\.com/([^/]+)', url)
    if match:
        return match.group(1)
    return ""

@router.post("/extract")
def extract_skills_from_github(req: GitHubExtractRequest):
    username = extract_github_username(req.github_url)
    if not username:
        raise HTTPException(status_code=400, detail="Invalid GitHub URL")
    
    api_url = f"https://api.github.com/users/{username}/repos?per_page=100"
    
    framework_keywords = {
        "react", "django", "fastapi", "next.js", "nextjs", "vue", "angular", "spring", 
        "express", "node", "nodejs", "flask", "laravel", "rails", "svelte", "tailwind",
        "tensorflow", "pytorch", "keras", "pandas", "docker", "kubernetes"
    }

    languages = set()

    try:
        # Using urllib to avoid external dependencies
        req_obj = urllib.request.Request(api_url, headers={'User-Agent': 'SkillGraph-App', 'Accept': 'application/vnd.github.mercy-preview+json'})
        with urllib.request.urlopen(req_obj) as response:
            if response.status == 200:
                repos = json.loads(response.read().decode())
                for repo in repos:
                    # 1. Extract Primary Language
                    if repo.get('language'):
                        languages.add(repo['language'])
                    
                    # 2. Extract Topics (often contain frameworks)
                    if 'topics' in repo and isinstance(repo['topics'], list):
                        for topic in repo['topics']:
                            languages.add(topic.capitalize())

                    # 3. Extract Keywords from Description
                    desc = str(repo.get('description', '')).lower()
                    for fw in framework_keywords:
                        if fw in desc:
                            languages.add(fw.capitalize())
                            
    except Exception as e:
        # Ignore errors if github fails
        print("GitHub fetch error:", e)
        pass
    
    if not languages:
        return {"message": "No skills found or GitHub fetch failed", "skills_added": 0}

    # Insert into database using supabase service role key
    skills_added = 0
    for lang in languages:
        try:
            # Check if skill already exists
            existing = supabase.table('student_skills').select('id').eq('student_id', req.student_id).eq('skill_name', lang).execute()
            if not existing.data:
                supabase.table('student_skills').insert({
                    "student_id": req.student_id,
                    "skill_name": lang,
                    "source": "github",
                    "verification_level": 0,
                    "skill_score": 10 # Base score for extracting
                }).execute()
                skills_added += 1
        except Exception as e:
            continue
            
    return {"message": "Extraction complete", "skills_added": skills_added, "languages": list(languages)}

@router.get("/mine/{student_id}")
def get_my_skills(student_id: str):
    try:
        response = supabase.table('student_skills').select('*').eq('student_id', student_id).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
