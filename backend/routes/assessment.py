from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from database import supabase
from services.llm import generate_questions, analyze_performance, generate_coding_questions, evaluate_code_submission, generate_project_idea, generate_explanation_fast, is_skill_programmable
import random
import json

from typing import Optional, List, Any

router = APIRouter()

class GetQuestionRequest(BaseModel):
    skill_name: str
    difficulty_level: int
    student_id: Optional[str] = None
    exclude_question_ids: Optional[List[Any]] = []
    topics: Optional[List[str]] = []
    node_id: Optional[str] = None

class SubmitAnswerRequest(BaseModel):
    student_id: Optional[str] = None
    skill_name: str
    question_id: str
    selected_option: str
    current_difficulty: int

@router.post("/get-question")
def get_adaptive_question(req: GetQuestionRequest):
    try:
        # Get globally seen questions for this student
        global_seen_ids = []
        if req.student_id:
            seen_res = supabase.table("student_seen_questions").select("question_id").eq("student_id", req.student_id).execute()
            global_seen_ids = [s['question_id'] for s in seen_res.data]
            
        clean_client_excludes = [
            str(x).strip() for x in (req.exclude_question_ids or []) 
            if x is not None and str(x).strip() and str(x) not in ("None", "null", "undefined")
        ]
        all_excludes = list(set(clean_client_excludes + global_seen_ids))
        
        seen_texts = set()
        seen_topics = req.topics if req.topics else []
        if all_excludes:
            # Note: Supabase limits in_ filter to 100-200 items in URL length usually, but it's safe for now
            # Alternatively, we just rely on DB unique constraints if we add one, but let's filter in memory
            seen_texts_res = supabase.table("questions").select("question_base_text, options_json").in_("id", all_excludes).execute()
            if hasattr(seen_texts_res, 'data'):
                seen_texts = set(sq['question_base_text'].strip() for sq in seen_texts_res.data if sq.get('question_base_text'))
                if not seen_topics:
                    seen_topics_db = [sq.get('options_json', {}).get('topic') for sq in seen_texts_res.data if sq.get('options_json') and sq.get('options_json').get('topic')]
                    # Keep only unique recent topics
                    seen_topics = list(set([t for t in seen_topics_db if t]))[:5]
        
        # 1. Try to fetch an existing question from Cache (DB)
        query = supabase.table("questions").select("*").eq("skill_name", req.skill_name).eq("difficulty_level", req.difficulty_level)
        res = query.execute()
        
        # Filter out questions they've already seen (by ID or exact text)
        unique_available = {}
        for q in res.data:
            if q['id'] in all_excludes:
                continue
            txt = q.get('question_base_text', '').strip()
            if txt in seen_texts:
                continue
            # Deduplicate locally by text
            if txt.lower() not in unique_available:
                unique_available[txt.lower()] = q
                
        available_questions = list(unique_available.values())

        # 2. If no questions exist, generate a batch via Gemini/Groq
        if not available_questions:
            print(f"Cache miss for {req.skill_name} Level {req.difficulty_level}. Generating...")
            
            # Retry loop up to 3 times to get valid unique questions
            for attempt in range(3):
                new_qs = generate_questions(req.skill_name, count=5, seen_topics=seen_topics, target_difficulty=req.difficulty_level, target_topics=req.topics)
                insert_data = []
                for q in new_qs:
                    diff = max(1, min(5, int(q.get("difficulty", req.difficulty_level))))
                    
                    raw_opts = q.get("options", [])
                    opts = [str(opt).strip() for opt in raw_opts]
                    correct_ans = str(q.get("correct_answer", opts[0] if opts else "")).strip()
                    
                    opts = list(dict.fromkeys(opts))
                    
                    if opts and correct_ans not in opts:
                        opts[-1] = correct_ans
                        opts = list(dict.fromkeys(opts))
                    
                    padding_options = ["None of the above", "All of the above", "Error", "Compilation failed", "Undefined"]
                    pad_idx = 0
                    while len(opts) < 4:
                        pad = padding_options[pad_idx % len(padding_options)]
                        if pad not in opts and pad != correct_ans:
                            opts.append(pad)
                        pad_idx += 1
                        
                    q_text = q.get("question_base_text", "Error parsing question")
                    code_snip = q.get("code_snippet", "")
                    
                    q_text_lower = q_text.lower()
                    if not code_snip and ("following" in q_text_lower or "output" in q_text_lower):
                        continue
                    
                    if code_snip:
                        q_text += f"\n\n```python\n{code_snip}\n```"
                        
                    if q_text.strip() in seen_texts:
                        continue
                    
                    insert_data.append({
                        "skill_name": req.skill_name,
                        "difficulty_level": diff,
                        "question_base_text": q_text,
                        "options_json": {"choices": opts, "topic": q.get("topic", "General")},
                        "correct_answer": correct_ans
                    })
                
                if insert_data:
                    insert_data[0]["difficulty_level"] = req.difficulty_level
                    inserted = supabase.table("questions").insert(insert_data).execute()
                    available_questions = [q for q in inserted.data if q['difficulty_level'] == req.difficulty_level and q['id'] not in all_excludes]
                    if available_questions:
                        break # Successfully generated unique questions, exit loop

        # 3. If STILL empty after retries, fallback gracefully
        if not available_questions:
            # ONLY fallback to questions matching the REQUIRED difficulty
            fallback = supabase.table("questions").select("*").eq("skill_name", req.skill_name).eq("difficulty_level", req.difficulty_level).execute()
            
            unique_fallback = {}
            for q in fallback.data:
                if q['id'] in all_excludes: continue
                txt = q.get('question_base_text', '').strip()
                if txt in seen_texts: continue
                if txt.lower() not in unique_fallback:
                    unique_fallback[txt.lower()] = q
                    
            avail_fallback = list(unique_fallback.values())
            if avail_fallback:
                available_questions = avail_fallback
            else:
                # If truly out of unique questions for this difficulty, clear the GLOBAL seen history dynamically to allow retakes,
                # BUT STRICTLY ENFORCE the current session's exclude_question_ids to prevent repetition in the same test.
                session_excludes = set(req.exclude_question_ids)
                
                # We need to know what texts were seen THIS session to prevent showing the exact same text again
                session_seen_texts = set()
                session_texts_res = supabase.table("questions").select("question_base_text").in_("id", list(session_excludes)).execute()
                if hasattr(session_texts_res, 'data'):
                    session_seen_texts = set(sq['question_base_text'].strip() for sq in session_texts_res.data if sq.get('question_base_text'))
                
                unique_session_fallback = {}
                for q in fallback.data:
                    if q['id'] in session_excludes: continue
                    txt = q.get('question_base_text', '').strip()
                    if txt in session_seen_texts: continue
                    if txt.lower() not in unique_session_fallback:
                        unique_session_fallback[txt.lower()] = q
                        
                session_safe_fallback = list(unique_session_fallback.values())
                if session_safe_fallback:
                    available_questions = session_safe_fallback
                else:
                    raise HTTPException(status_code=500, detail="Failed to fetch or generate unique questions for this session. Please try again.")

        # 4. Pick a random question
        chosen_q = random.choice(available_questions)
        
        # 5. Anti-plagiarism/Cheating: Shuffle choices dynamically!
        options_data = chosen_q['options_json']
        if isinstance(options_data, dict) and "choices" in options_data:
            options = list(options_data["choices"])
            topic = options_data.get("topic", "General")
        else:
            options = list(options_data)
            topic = "General"
            
        random.shuffle(options)

        # 6. Anti-Cheat: Mark as seen IMMEDIATELY upon fetch
        if req.student_id:
            try:
                supabase.table("student_seen_questions").insert({
                    "student_id": req.student_id,
                    "skill_name": req.skill_name,
                    "question_id": chosen_q['id']
                }).execute()
            except Exception as se:
                print("Already seen or error recording:", se)

        return {
            "question_id": chosen_q['id'],
            "difficulty_level": chosen_q['difficulty_level'],
            "question_text": chosen_q['question_base_text'],
            "options": options,
            "topic": topic
        }

    except Exception as e:
        print("Error getting question:", e)
        raise HTTPException(status_code=500, detail=str(e))

def pregenerate_questions_task(skill_name: str, difficulty_level: int):
    """Background task to pregenerate questions if cache is low."""
    try:
        # Check cache
        res = supabase.table("questions").select("id").eq("skill_name", skill_name).eq("difficulty_level", difficulty_level).execute()
        if len(res.data) < 2:
            print(f"[Background] Cache low for {skill_name} Level {difficulty_level}. Pregenerating...")
            new_qs = generate_questions(skill_name, count=5, target_difficulty=difficulty_level)
            insert_data = []
            for q in new_qs:
                diff = max(1, min(5, int(q.get("difficulty", difficulty_level))))
                raw_opts = q.get("options", [])
                opts = [str(opt).strip() for opt in raw_opts]
                correct_ans = str(q.get("correct_answer", opts[0] if opts else "")).strip()
                opts = list(dict.fromkeys(opts))
                if opts and correct_ans not in opts:
                    opts[-1] = correct_ans
                    opts = list(dict.fromkeys(opts))
                
                padding_options = ["None of the above", "All of the above", "Error", "Compilation failed", "Undefined"]
                pad_idx = 0
                while len(opts) < 4:
                    pad = padding_options[pad_idx % len(padding_options)]
                    if pad not in opts and pad != correct_ans:
                        opts.append(pad)
                    pad_idx += 1
                
                q_text = q.get("question_base_text", "Error parsing question")
                code_snip = q.get("code_snippet", "")
                q_text_lower = q_text.lower()
                if not code_snip and ("following" in q_text_lower or "output" in q_text_lower):
                    continue
                if code_snip:
                    q_text += f"\n\n```python\n{code_snip}\n```"
                
                insert_data.append({
                    "skill_name": skill_name,
                    "difficulty_level": difficulty_level,
                    "question_base_text": q_text,
                    "options_json": {"choices": opts, "topic": q.get("topic", "General")},
                    "correct_answer": correct_ans
                })
            
            if insert_data:
                insert_data[0]["difficulty_level"] = difficulty_level
                supabase.table("questions").insert(insert_data).execute()
                print(f"[Background] Pre-generation successful for {skill_name} Level {difficulty_level}")
    except Exception as e:
        print(f"[Background] Pre-generation failed: {e}")

@router.post("/submit-answer")
def submit_answer(req: SubmitAnswerRequest, background_tasks: BackgroundTasks):
    try:
        # Note: question is now marked as seen globally in get-question to prevent proctoring cheats

        # 1. Fetch correct answer from DB
        q_res = supabase.table("questions").select("correct_answer, question_base_text").eq("id", req.question_id).execute()
        if not q_res.data:
            raise HTTPException(status_code=404, detail="Question not found")
            
        correct_ans = q_res.data[0]['correct_answer']
        
        # 2. Check if correct
        is_correct = (req.selected_option.strip() == correct_ans.strip())
        
        # 3. Adaptive Logic: Adjust next difficulty
        next_difficulty = req.current_difficulty
        if is_correct:
            next_difficulty = min(5, req.current_difficulty + 1)
        else:
            next_difficulty = max(1, req.current_difficulty - 1)
            
        # Spawn background task to pre-generate for next_difficulty
        background_tasks.add_task(pregenerate_questions_task, req.skill_name, next_difficulty)
        
        # Fast Explanation Generation using Groq
        explanation = generate_explanation_fast(
            skill_name=req.skill_name,
            question_text=q_res.data[0].get('question_base_text', ''),
            options=[],  # We can omit options to save tokens if we just want a generic explanation of the answer
            correct_answer=correct_ans
        )
            
        return {
            "is_correct": is_correct,
            "correct_answer": correct_ans,
            "next_difficulty": next_difficulty,
            "explanation": explanation
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class GetCodingQuestionRequest(BaseModel):
    skill_name: str
    difficulty_type: str # basic or conceptual
    student_id: Optional[str] = None

@router.post("/get-coding-question")
def get_coding_question(req: GetCodingQuestionRequest):
    try:
        if not is_skill_programmable(req.skill_name):
            return {"is_programmable": False}

        difficulty_level = 4 if req.difficulty_type == "basic" else 5
        selected_q = None
        
        if req.student_id:
            # Fetch seen coding questions
            seen_res = supabase.table("student_seen_coding_questions").select("coding_question_id").eq("student_id", req.student_id).execute()
            seen_ids = [r['coding_question_id'] for r in seen_res.data]
            
            # Fetch all questions for this skill and level
            all_q_res = supabase.table("coding_questions").select("*").eq("skill_name", req.skill_name).eq("difficulty_level", difficulty_level).execute()
            
            unseen_qs = [q for q in all_q_res.data if q['id'] not in seen_ids]
            
            if unseen_qs:
                selected_q = random.choice(unseen_qs)
                
        if not selected_q:
            print("No unseen coding questions available in DB. Generating a new one.")
            q_data = generate_coding_questions(req.skill_name, req.difficulty_type)
            
            q_text = q_data.get("question_base_text", "Write a complete program based on standard interview problems.")
            starter = q_data.get("starter_code", "")
            correct_ans = str(q_data.get("correct_answer", ""))
            topic = q_data.get("topic", "Coding")
            
            # Insert into DB
            insert_res = supabase.table("coding_questions").insert({
                "skill_name": req.skill_name,
                "difficulty_level": difficulty_level,
                "question_base_text": q_text,
                "starter_code": starter,
                "correct_answer": correct_ans,
                "topic": topic
            }).execute()
            
            if insert_res.data:
                selected_q = insert_res.data[0]
            else:
                selected_q = {
                    "question_base_text": q_text,
                    "topic": topic,
                    "starter_code": starter,
                    "id": None
                }

        # Mark as seen
        if req.student_id and selected_q.get("id"):
            try:
                supabase.table("student_seen_coding_questions").insert({
                    "student_id": req.student_id,
                    "skill_name": req.skill_name,
                    "coding_question_id": selected_q["id"]
                }).execute()
            except Exception as e:
                print("Already seen or error marking coding question as seen:", e)
                
        q_id = str(selected_q.get("id")) if selected_q.get("id") else f"coding_{random.randint(1000, 9999)}"
        return {
            "question_id": q_id,
            "id": q_id,
            "question_text": selected_q.get("question_base_text", ""),
            "topic": selected_q.get("topic", "Coding"),
            "starter_code": selected_q.get("starter_code", "")
        }
    except Exception as e:
        print("Error getting coding question:", e)
        raise HTTPException(status_code=500, detail=str(e))

class EvaluateCodeRequest(BaseModel):
    skill_name: str
    question_text: str
    student_code: str

@router.post("/evaluate-code")
def evaluate_code(req: EvaluateCodeRequest):
    try:
        eval_data = evaluate_code_submission(req.skill_name, req.question_text, req.student_code)
        return eval_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class AnswerHistory(BaseModel):
    topic: str
    is_correct: bool
    difficulty: int

class CompleteAssessmentRequest(BaseModel):
    student_id: str | None
    skill_name: str
    score_percentage: float
    history: list[dict]
    node_id: str = None
    roadmap_id: str = None
    violations: int = 0

class SimulateCodeRequest(BaseModel):
    skill_name: str
    code: str

class ReportQuestionRequest(BaseModel):
    question_id: str
    student_id: str | None
    reason: str

@router.post("/report-question")
def report_question(req: ReportQuestionRequest):
    try:
        import json
        import os
        from datetime import datetime
        
        report = {
            "question_id": req.question_id,
            "student_id": req.student_id,
            "reason": req.reason,
            "timestamp": datetime.now().isoformat()
        }
        
        # Log to file since we don't have DB DDL access for new tables yet
        file_path = os.path.join(os.path.dirname(__file__), "..", "reported_questions.json")
        reports = []
        if os.path.exists(file_path):
            with open(file_path, "r") as f:
                try:
                    reports = json.load(f)
                except:
                    pass
        reports.append(report)
        with open(file_path, "w") as f:
            json.dump(reports, f, indent=4)
            
        return {"status": "success", "message": "Question reported successfully"}
    except Exception as e:
        print("Error reporting question:", e)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/complete")
def complete_assessment(req: CompleteAssessmentRequest):
    try:
        analytics = analyze_performance(req.skill_name, req.history)
        
        # Calculate integrity deduction if proctoring infractions exceeded threshold (>3)
        integrity_penalty = 0
        effective_score = req.score_percentage
        if req.violations > 3:
            integrity_penalty = min(35, (req.violations - 3) * 10 + 10)
            effective_score = max(0, req.score_percentage - integrity_penalty)
            analytics += f"\n\n**Proctoring Audit:** {req.violations} unverified window interruptions/actions flagged during examination. An integrity trust deduction of -{integrity_penalty} points was applied to your verified competency benchmark."
        
        if effective_score >= 60:
            skill_res = supabase.table("student_skills").select("*").eq("student_id", req.student_id).eq("skill_name", req.skill_name).execute()
            
            if skill_res.data:
                new_score = skill_res.data[0]['skill_score'] + int(effective_score / 2)
                
                update_payload = {
                    "verification_level": 1,
                    "skill_score": new_score
                }
                supabase.table("student_skills").update(update_payload).eq("id", skill_res.data[0]['id']).execute()
            else:
                insert_payload = {
                    "student_id": req.student_id,
                    "skill_name": req.skill_name,
                    "verification_level": 1,
                    "skill_score": int(effective_score)
                }
                supabase.table("student_skills").insert(insert_payload).execute()
                
                # Roadmap Integration: Mark node as assessed
                if req.node_id and req.roadmap_id and req.student_id:
                    try:
                        supabase.table("student_roadmap_nodes").update({
                            "status": "assessed",
                            "assessment_score": int(req.score_percentage)
                        }).eq("roadmap_id", req.roadmap_id).eq("student_id", req.student_id).eq("node_id", req.node_id).execute()
                        
                        # In a full implementation, we would also:
                        # 1. Fetch roadmap_json
                        # 2. Check edges to find dependent nodes
                        # 3. Update their status to 'unlocked' in student_roadmap_nodes
                    except Exception as roadmap_e:
                        print("Roadmap node update failed (table might not exist yet):", roadmap_e)
                
                return {
                    "message": "Assessment passed! Skill upgraded to Level 1.",
                    "passed": True,
                    "analytics": analytics
                }
        
        return {
            "message": "Assessment completed. Keep practicing!",
            "passed": False,
            "analytics": analytics
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/simulate-code")
def simulate_code(req: SimulateCodeRequest):
    try:
        from services.llm import simulate_code_execution
        output = simulate_code_execution(req.skill_name, req.code)
        return {"output": output}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class ProjectIdeaRequest(BaseModel):
    skill_name: str

@router.post("/project-idea")
def get_project_idea(req: ProjectIdeaRequest):
    try:
        idea = generate_project_idea(req.skill_name)
        return {"idea": idea}
    except Exception as e:
        print("Project idea error:", e)
        raise HTTPException(status_code=500, detail=str(e))

class ExplainRequest(BaseModel):
    skill_name: str
    question_text: str
    options: list[str]
    correct_answer: str

@router.post("/explain")
def explain_question(req: ExplainRequest):
    try:
        explanation = generate_explanation_fast(req.skill_name, req.question_text, req.options, req.correct_answer)
        return {"explanation": explanation}
    except Exception as e:
        print("Explain error:", e)
        raise HTTPException(status_code=500, detail=str(e))
