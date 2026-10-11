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
