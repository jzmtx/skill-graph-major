from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import supabase
from services.llm import analyze_github_repo, client
import json

router = APIRouter()

class VerifyRepoRequest(BaseModel):
    student_id: str
    skill_name: str
    github_url: str
    project_abstract: str

class SubmitInterviewRequest(BaseModel):
    student_id: str
    skill_name: str
    github_url: str
    question_asked: str
    student_answer: str

@router.post("/verify-repo")
async def verify_repo(req: VerifyRepoRequest):
    try:
        # Analyze the repo, check SE principles, and generate question
        analysis_result = analyze_github_repo(req.github_url, req.skill_name, req.project_abstract)
        
        if not analysis_result.get("passed_checks"):
            raise HTTPException(status_code=400, detail=analysis_result.get("feedback", "Failed software engineering principles check."))
            
        return {
            "message": "Repository analyzed and principles verified.",
            "interview_question": analysis_result.get("interview_question")
        }
        
    except Exception as e:
        print("Error verifying repo:", e)
        raise HTTPException(status_code=500, detail="Failed to analyze repository. Make sure the URL is public and valid.")

@router.post("/submit-interview")
async def submit_interview(req: SubmitInterviewRequest):
    try:
        # Use LLM to grade the student's answer
        prompt = f"""
        You are a senior software engineering manager conducting an anti-plagiarism interview.
        The candidate claims to have built a project at {req.github_url} using {req.skill_name}.
        
        You asked them this specific architectural question: "{req.question_asked}"
        
        The candidate answered: "{req.student_answer}"
        
        Evaluate their answer. Does their answer demonstrate a genuine, working knowledge of the code 
        they supposedly wrote? Or does it sound like a generic, copy-pasted, or hallucinated response?
        
        Return ONLY a JSON object with two keys:
        - "passed": boolean (true if they passed the verification, false if they failed)
        - "feedback": A short string explaining why they passed or failed.
        """
        
        # We'll use a direct call here for simplicity, although ideally it'd be in llm.py
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
        )
        
        # Clean the response to ensure it's valid JSON
        raw_text = response.text.strip()
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:-3]
            
        try:
            result = json.loads(raw_text)
        except Exception:
            # Fallback if json parsing fails
            passed = "true" in raw_text.lower() and "false" not in raw_text.lower()
            result = {"passed": passed, "feedback": raw_text}

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
