from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import supabase
from typing import Any, Dict

router = APIRouter()

@router.get("/users")
async def get_all_users():
    try:
        # Fetch students and their verified skills
        res = supabase.table("students").select("*, student_skills(skill_name, verification_level, skill_score)").execute()
        return {"users": res.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/questions")
async def get_all_questions():
    try:
        mcqs = supabase.table("questions").select("*").execute()
        coding = supabase.table("coding_questions").select("*").execute()
        
        return {
            "mcqs": mcqs.data,
            "coding_questions": coding.data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/market")
async def get_market_data():
    try:
        data = supabase.table("job_market_data").select("*").execute()
        roadmaps = supabase.table("career_paths").select("*").execute()
        return {
            "market_data": data.data,
            "roadmaps": roadmaps.data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class UpdateQuestionRequest(BaseModel):
    question_base_text: str
    options_json: Dict[str, Any]
    correct_answer: str
    difficulty_level: int

@router.put("/questions/{question_id}")
async def update_mcq(question_id: str, req: UpdateQuestionRequest):
    try:
        updated = supabase.table("questions").update({
            "question_base_text": req.question_base_text,
            "options_json": req.options_json,
            "correct_answer": req.correct_answer,
            "difficulty_level": req.difficulty_level
        }).eq("id", question_id).execute()
        
        if not updated.data:
            raise HTTPException(status_code=404, detail="Question not found")
            
        return {"message": "Question updated successfully", "question": updated.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class UpdateCodingQuestionRequest(BaseModel):
    question_base_text: str
    starter_code: str
    correct_answer: str
    difficulty_level: int

@router.put("/coding_questions/{question_id}")
async def update_coding_question(question_id: str, req: UpdateCodingQuestionRequest):
    try:
        updated = supabase.table("coding_questions").update({
            "question_base_text": req.question_base_text,
            "starter_code": req.starter_code,
            "correct_answer": req.correct_answer,
            "difficulty_level": req.difficulty_level
        }).eq("id", question_id).execute()
        
        if not updated.data:
            raise HTTPException(status_code=404, detail="Question not found")
            
        return {"message": "Coding Question updated successfully", "question": updated.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api_usage")
async def get_api_usage():
    try:
        logs = supabase.table("api_usage_logs").select("*").order("created_at", desc=True).limit(100).execute()
        return {"logs": logs.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
