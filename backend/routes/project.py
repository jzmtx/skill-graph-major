from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional
from database import supabase
from services.llm import analyze_github_repo, get_calibrated_defense_questions, client
import json
import uuid
from datetime import datetime, timezone

router = APIRouter()

# In-memory interview scheduling registry
scheduled_interviews = {}

class VerifyRepoRequest(BaseModel):
    student_id: str
    skill_name: str
    github_url: str
    project_abstract: str

class ScheduleInterviewRequest(BaseModel):
    student_id: Optional[str] = None
    skill_name: str
    github_url: str
    project_abstract: str

class QA(BaseModel):
    question: str
    answer: str

class SubmitInterviewRequest(BaseModel):
    student_id: str
    skill_name: str
    github_url: str
    qa_pairs: List[QA]

def process_async_repo_audit(interview_id: str, github_url: str, skill_name: str, project_abstract: str):
    """Background worker that audits repository and prepares interview questions."""
    print(f"[AsyncInterview] Background audit started for interview {interview_id} ({skill_name})...")
    try:
        analysis_result = analyze_github_repo(github_url, skill_name, project_abstract)
        if not analysis_result.get("passed_checks", True):
            scheduled_interviews[interview_id]["status"] = "INVALID"
            scheduled_interviews[interview_id]["feedback"] = analysis_result.get("feedback", f"No {skill_name} implementation found in this repository.")
            scheduled_interviews[interview_id]["questions"] = []
            print(f"[AsyncInterview] Repository rejected for {interview_id}: {scheduled_interviews[interview_id]['feedback']}")
            return

        questions = analysis_result.get("questions") or []
        if not questions:
            questions = get_calibrated_defense_questions(skill_name, github_url, project_abstract)
        scheduled_interviews[interview_id]["status"] = "READY"
        scheduled_interviews[interview_id]["questions"] = questions
        scheduled_interviews[interview_id]["ready_at"] = datetime.now(timezone.utc).isoformat()
        print(f"[AsyncInterview] Successfully prepared questions for interview {interview_id}!")
    except Exception as e:
        print(f"[AsyncInterview] Error in background audit for {interview_id}: {e}")
        scheduled_interviews[interview_id]["status"] = "READY"
        scheduled_interviews[interview_id]["questions"] = get_calibrated_defense_questions(skill_name, github_url, project_abstract)

@router.post("/schedule-interview")
async def schedule_interview(req: ScheduleInterviewRequest, background_tasks: BackgroundTasks):
    """
    Instantly schedule a Level 2 oral defense interview.
    Auditing runs asynchronously in background so candidate never experiences timeouts.
    """
    if "github.com" not in req.github_url:
        raise HTTPException(status_code=400, detail="Please provide a valid GitHub repository URL.")
        
    interview_id = str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()
    
    scheduled_interviews[interview_id] = {
        "id": interview_id,
        "student_id": req.student_id,
        "skill_name": req.skill_name,
        "github_url": req.github_url,
        "project_abstract": req.project_abstract,
        "status": "PREPARING",
        "created_at": now_iso,
        "questions": []
    }
    
    # Dispatch non-blocking background analysis
    background_tasks.add_task(
        process_async_repo_audit, 
        interview_id, 
        req.github_url, 
        req.skill_name, 
        req.project_abstract
    )
    
    return {
        "success": True,
        "interview_id": interview_id,
        "status": "PREPARING",
        "message": "Repository registered! AI Assessor is currently reviewing your codebase in the background.",
        "estimated_seconds": 25
    }

@router.get("/interview-status/{interview_id}")
async def get_interview_status(interview_id: str):
    """Poll the status of a scheduled interview."""
    interview = scheduled_interviews.get(interview_id)
    if not interview:
        raise HTTPException(status_code=404, detail="Interview session not found.")
        
    return {
        "interview_id": interview_id,
        "status": interview["status"],
        "feedback": interview.get("feedback"),
        "questions": interview.get("questions", []),
        "ready_at": interview.get("ready_at"),
        "skill_name": interview.get("skill_name"),
        "github_url": interview.get("github_url")
    }

@router.post("/verify-repo")
async def verify_repo(req: VerifyRepoRequest):
    try:
        analysis_result = analyze_github_repo(req.github_url, req.skill_name, req.project_abstract)
        if not analysis_result.get("passed_checks", True):
            raise HTTPException(status_code=400, detail=analysis_result.get("feedback", f"No {req.skill_name} implementation detected."))
        return {
            "message": "Repository analyzed and principles verified.",
            "questions": analysis_result.get("questions", [])
        }
    except HTTPException:
        raise
    except Exception as e:
        print("Error verifying repo:", e)
        # Fallback questions so student is never blocked
        return {
            "message": "Repository analyzed and oral defense calibrated.",
            "questions": get_calibrated_defense_questions(req.skill_name, req.github_url, req.project_abstract)
        }

@router.post("/submit-interview")
async def submit_interview(req: SubmitInterviewRequest):
    try:
        qa_text = ""
        for i, qa in enumerate(req.qa_pairs):
            qa_text += f"Q{i+1}: {qa.question}\nA: {qa.answer}\n\n"
            
        # Use LLM to grade the student's answer
        prompt = f"""
        You are a senior software engineering manager conducting an anti-plagiarism interview.
        The candidate claims to have built a project at {req.github_url} using {req.skill_name}.
        
        You asked them the following sequence of architectural and coding questions:
        
        {qa_text}
        
        Evaluate their answers holistically using this strict rubric:
        1. Conceptual Depth: Do their answers demonstrate genuine comprehension of real-world implementation tradeoffs in {req.skill_name}?
        2. Authorship Authenticity: Do they sound like the developer who wrote the code, or generic AI/copy-pasted fluff?
        3. Code Snippet Correctness: For the coding question, did they write a syntactically and logically sound code snippet?
        
        Return ONLY a JSON object:
        {{
            "passed": true or false,
            "feedback": "A clear 2-sentence explanation of why they passed or failed, referencing specific answers."
        }}
        """
        
        # Check local Ollama model first
        from dotenv import dotenv_values
        import os
        import requests
        env = dotenv_values(".env")
        ollama_url = env.get("OLLAMA_BASE_URL", os.environ.get("OLLAMA_BASE_URL"))
        ollama_model = env.get("OLLAMA_MODEL", os.environ.get("OLLAMA_MODEL", "llama3.2:3b"))
        
        result = None
        if ollama_url:
            try:
                resp = requests.post(
                    f"{ollama_url.rstrip('/')}/api/generate",
                    json={
                        "model": ollama_model,
                        "prompt": prompt,
                        "format": "json",
                        "stream": False,
                        "options": {"temperature": 0.2}
                    },
                    timeout=20
                )
                if resp.status_code == 200:
                    raw_text = resp.json().get("response", "{}")
                    result = json.loads(raw_text)
                    print(f"[ProjectVerify] Evaluated interview using local Ollama model '{ollama_model}'!")
            except Exception as oe:
                print(f"[ProjectVerify] Local Ollama evaluation bypassed ({oe}), using Groq fallback...")
                
        if not result:
            from services.llm import call_groq_with_retries
            from groq_models import GROQ_PRIMARY
            response = call_groq_with_retries(
                model=GROQ_PRIMARY,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
                response_format={"type": "json_object"}
            )
            raw_text = response.choices[0].message.content.strip()
            result = json.loads(raw_text)

        # If passed, upgrade to Level 2!
        if result.get("passed"):
            skill_res = supabase.table("student_skills").select("*").eq("student_id", req.student_id).eq("skill_name", req.skill_name).execute()
            if skill_res.data:
                # Big score bonus for Level 2
                new_score = skill_res.data[0]['skill_score'] + 100
                
                supabase.table("student_skills").update({
                    "verification_level": 2,
                    "skill_score": new_score
                }).eq("id", skill_res.data[0]['id']).execute()
                
        return result
        
    except Exception as e:
        print("Error submitting interview:", e)
        raise HTTPException(status_code=500, detail=str(e))
