from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
from database import supabase
from services.llm import analyze_github_repo, client
import json

router = APIRouter()

class VerifyRepoRequest(BaseModel):
    student_id: str
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

@router.post("/verify-repo")
async def verify_repo(req: VerifyRepoRequest):
    try:
        # Analyze the repo, check SE principles, and generate question
        analysis_result = analyze_github_repo(req.github_url, req.skill_name, req.project_abstract)
        
        if not analysis_result.get("passed_checks"):
            raise HTTPException(status_code=400, detail=analysis_result.get("feedback", "Failed software engineering principles check."))
            
        return {
            "message": "Repository analyzed and principles verified.",
            "questions": analysis_result.get("questions")
        }
        
    except Exception as e:
        print("Error verifying repo:", e)
        raise HTTPException(status_code=500, detail="Failed to analyze repository. Make sure the URL is public and valid.")

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
        
        Evaluate their answers holistically. Do their answers demonstrate a genuine, working knowledge of the code 
        they supposedly wrote? Or do they sound like generic, copy-pasted, or hallucinated responses?
        If they failed to provide a valid, conceptually correct coding snippet for the coding question, they MUST fail the interview.
        
        Return ONLY a JSON object with two keys:
        - "passed": boolean (true if they passed the verification, false if they failed)
        - "feedback": A short string explaining why they passed or failed, referencing specific answers.
        """
        
        # Use Groq client imported from services.llm
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            response_format={"type": "json_object"}
        )
        
        raw_text = response.choices[0].message.content.strip()
            
        try:
            result = json.loads(raw_text)
        except Exception:
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
