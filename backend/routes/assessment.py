from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from database import supabase
from services.llm import generate_questions, analyze_performance, generate_coding_questions, evaluate_code_submission, generate_project_idea, generate_explanation_fast, is_skill_programmable
from services.fingerprint import (
    generate_canonical_fingerprint,
    is_duplicate_context,
    extract_concept_tokens
)
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
    current_difficulty: Optional[int] = 1
class PrewarmRequest(BaseModel):
    skill_name: str
    student_id: Optional[str] = None

active_stocking_skills: set = set()

def ensure_skill_questions_stocked(skill_name: str, min_per_level: int = 5, student_id: Optional[str] = None):
    """
    Checks all difficulty levels (1 through 5) for a given skill.
    If any level has fewer than min_per_level questions available in the database,
    it automatically generates, deduplicates, and caches verified questions in the background.
    Also ensures coding questions exist if the skill is programmable.
    Zero latency impact on students.
    """
    norm_skill = (skill_name or "").strip()
    if not norm_skill:
        return
    norm_key = norm_skill.lower()
    if norm_key in active_stocking_skills:
        print(f"[Stocking] Already actively stocking questions for '{norm_skill}'. Skipping duplicate task.")
        return
    
    active_stocking_skills.add(norm_key)
    try:
        print(f"[Stocking] Checking question inventory for '{norm_skill}' across Levels 1-5 (min {min_per_level}/level)...")
        
        seen_ids = set()
        seen_texts = set()
        seen_fingerprints = set()
        
        if student_id:
            try:
                s_res = supabase.table("student_seen_questions").select("question_id").eq("student_id", student_id).execute()
                if hasattr(s_res, 'data') and s_res.data:
                    seen_ids = set(str(s['question_id']) for s in s_res.data)
                    if seen_ids:
                        q_texts_res = supabase.table("questions").select("question_base_text").in_("id", list(seen_ids)[:200]).execute()
                        if hasattr(q_texts_res, 'data') and q_texts_res.data:
                            for r in q_texts_res.data:
                                t = r.get("question_base_text", "").strip()
                                if t:
                                    seen_texts.add(t)
                                    seen_fingerprints.add(generate_canonical_fingerprint(t))
            except Exception as se:
                print(f"[Stocking] Error fetching student history: {se}")

        # Check all 5 difficulty levels for this skill
        for target_diff in [1, 2, 3, 4, 5]:
            try:
                db_res = supabase.table("questions").select("id, question_base_text").ilike("skill_name", norm_skill).eq("difficulty_level", target_diff).execute()
                
                unseen_count = 0
                if hasattr(db_res, 'data') and db_res.data:
                    for q in db_res.data:
                        qid = str(q.get("id"))
                        qtxt = q.get("question_base_text", "").strip()
                        if qid not in seen_ids and qtxt not in seen_texts and not is_duplicate_context(qtxt, seen_texts):
                            unseen_count += 1
                
                if unseen_count < min_per_level:
                    needed = min_per_level - unseen_count
                    batch_to_generate = max(needed, 3)
                    print(f"[Stocking] Level {target_diff} low for '{norm_skill}' (unseen={unseen_count}, min={min_per_level}). Generating {batch_to_generate} questions in background...")
                    
                    new_qs = generate_questions(norm_skill, count=batch_to_generate, target_difficulty=target_diff)
                    insert_data = []
                    for q in new_qs:
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
                        
                        clean_txt = q_text.strip()
                        if clean_txt in seen_texts:
                            continue
                        q_fp = generate_canonical_fingerprint(clean_txt)
                        if q_fp in seen_fingerprints:
                            continue
                        if is_duplicate_context(clean_txt, seen_texts):
                            continue
                        
                        topic = q.get("topic", "General")
                        insert_data.append({
                            "skill_name": norm_skill,
                            "difficulty_level": target_diff,
                            "question_base_text": clean_txt,
                            "options_json": {"choices": opts, "topic": topic, "fingerprint": q_fp},
                            "correct_answer": correct_ans
                        })
                        seen_texts.add(clean_txt)
                        seen_fingerprints.add(q_fp)
                    
                    if insert_data:
                        supabase.table("questions").insert(insert_data).execute()
                        print(f"[Stocking] Successfully pre-generated and stored {len(insert_data)} questions for '{norm_skill}' Level {target_diff}")
            except Exception as level_err:
                print(f"[Stocking] Error stocking Level {target_diff} for '{norm_skill}': {level_err}")
                continue

        # Check and stock coding questions if the skill is programmable
        if is_skill_programmable(norm_skill):
            try:
                cq_res = supabase.table("coding_questions").select("id, difficulty_level").ilike("skill_name", norm_skill).execute()
                cq_count = len(cq_res.data or [])
                if cq_count < 2:
                    print(f"[Stocking] Coding questions low for '{norm_skill}' ({cq_count}/2). Generating sandboxes in background...")
                    for diff_type, target_lvl in [("basic", 4), ("conceptual", 5)]:
                        q_data = generate_coding_questions(norm_skill, diff_type)
                        q_text = q_data.get("question_base_text", f"Write a practical program demonstrating {norm_skill}.")
                        starter = q_data.get("starter_code", "// Starter code\n")
                        correct_ans = str(q_data.get("correct_answer", ""))
                        topic = q_data.get("topic", "Coding")
                        supabase.table("coding_questions").insert({
                            "skill_name": norm_skill,
                            "difficulty_level": target_lvl,
                            "question_base_text": q_text,
                            "starter_code": starter,
                            "correct_answer": correct_ans,
                            "topic": topic
                        }).execute()
                    print(f"[Stocking] Successfully pre-generated coding sandboxes for '{norm_skill}'")
            except Exception as cq_err:
                print(f"[Stocking] Error stocking coding questions for '{norm_skill}': {cq_err}")

    except Exception as e:
        print(f"[Stocking] Global stocking task encountered an error for '{norm_skill}': {e}")
    finally:
        active_stocking_skills.discard(norm_key)

def speculative_pregeneration_task(skill_name: str, current_difficulty: int, student_id: Optional[str] = None):
    """
    Backwards-compatible wrapper delegating to ensure_skill_questions_stocked.
    """
    ensure_skill_questions_stocked(skill_name, min_per_level=5, student_id=student_id)

@router.post("/prewarm")
def prewarm_skill_assessment(req: PrewarmRequest, background_tasks: BackgroundTasks):
    background_tasks.add_task(ensure_skill_questions_stocked, req.skill_name, 5, req.student_id)
    return {"status": "ok", "message": f"Prewarming question pool for {req.skill_name}"}

@router.post("/get-question")
def get_adaptive_question(req: GetQuestionRequest, background_tasks: BackgroundTasks):
    try:
        # 1. Get globally seen questions for this student across ALL historical assessments/attempts
        global_seen_ids = []
        seen_texts = set()
        seen_fingerprints = set()
        seen_topics = req.topics if req.topics else []
        
        if req.student_id:
            try:
                seen_res = supabase.table("student_seen_questions").select("question_id").eq("student_id", req.student_id).execute()
                if hasattr(seen_res, 'data') and seen_res.data:
                    global_seen_ids = [str(s['question_id']) for s in seen_res.data]
            except Exception as se:
                print("Error loading student_seen_questions:", se)
            
        clean_client_excludes = [
            str(x).strip() for x in (req.exclude_question_ids or []) 
            if x is not None and str(x).strip() and str(x) not in ("None", "null", "undefined")
        ]
        all_excludes = list(set(clean_client_excludes + global_seen_ids))
        
        if all_excludes:
            # Query texts and fingerprints for all excluded questions to enforce deduplication
            seen_texts_res = supabase.table("questions").select("id, question_base_text, options_json").in_("id", all_excludes[:200]).execute()
            if hasattr(seen_texts_res, 'data') and seen_texts_res.data:
                for sq in seen_texts_res.data:
                    txt = sq.get('question_base_text', '').strip()
                    if txt:
                        seen_texts.add(txt)
                        seen_fingerprints.add(generate_canonical_fingerprint(txt))
                    if isinstance(sq.get('options_json'), dict):
                        top = sq['options_json'].get('topic')
                        if top and top not in seen_topics:
                            seen_topics.append(top)
        
        # 2. Try to fetch an existing UNSEEN, NON-DUPLICATE question from Cache (DB)
        target_diff = max(1, min(5, int(req.difficulty_level)))
        query = supabase.table("questions").select("*").eq("skill_name", req.skill_name).eq("difficulty_level", target_diff)
        res = query.execute()
        
        available_questions = []
        if hasattr(res, 'data') and res.data:
            for q in res.data:
                qid = str(q.get('id', ''))
                if qid in all_excludes:
                    continue
                txt = q.get('question_base_text', '').strip()
                if not txt:
                    continue
                if txt in seen_texts:
                    continue
                
                # Check canonical concept fingerprint
                q_fp = generate_canonical_fingerprint(txt)
                if q_fp in seen_fingerprints:
                    continue
                
                # Check semantic duplicate context / paraphrasing
                if is_duplicate_context(txt, seen_texts):
                    continue
                
                available_questions.append(q)

        # 3. If no unseen questions exist in DB for this student/level, generate a fresh batch via LLM!
        # STRICT REQUIREMENT: NEVER recycle old questions for a student who has already seen them.
        if not available_questions:
            print(f"No unseen questions in DB for {req.skill_name} Level {target_diff}. Generating fresh questions...")
            for attempt in range(3):
                new_qs = generate_questions(
                    req.skill_name, 
                    count=5, 
                    seen_topics=seen_topics[:5], 
                    target_difficulty=target_diff, 
                    target_topics=req.topics
                )
                insert_data = []
                for q in new_qs:
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
                    
                    clean_txt = q_text.strip()
                    if clean_txt in seen_texts:
                        continue
                    q_fp = generate_canonical_fingerprint(clean_txt)
                    if q_fp in seen_fingerprints:
                        continue
                    if is_duplicate_context(clean_txt, seen_texts):
                        continue
                    
                    topic = q.get("topic", "General")
                    insert_data.append({
                        "skill_name": req.skill_name,
                        "difficulty_level": target_diff,
                        "question_base_text": clean_txt,
                        "options_json": {"choices": opts, "topic": topic, "fingerprint": q_fp},
                        "correct_answer": correct_ans
                    })
                    seen_texts.add(clean_txt)
                    seen_fingerprints.add(q_fp)
                
                if insert_data:
                    inserted = supabase.table("questions").insert(insert_data).execute()
                    if hasattr(inserted, 'data') and inserted.data:
                        available_questions = [
                            q for q in inserted.data 
                            if q['difficulty_level'] == target_diff 
                            and str(q['id']) not in all_excludes
                        ]
                        if available_questions:
                            break

        # Fallback emergency fresh generation if empty
        if not available_questions:
            print("Fallback emergency fresh generation...")
            emergency_qs = generate_questions(req.skill_name, count=2, target_difficulty=target_diff)
            insert_data = []
            for q in emergency_qs:
                raw_opts = q.get("options", ["Option A", "Option B", "Option C", "Option D"])
                opts = [str(opt).strip() for opt in raw_opts]
                correct_ans = str(q.get("correct_answer", opts[0] if opts else "Option A")).strip()
                opts = list(dict.fromkeys(opts))
                while len(opts) < 4:
                    opts.append(f"Option {chr(65 + len(opts))}")
                clean_txt = q.get("question_base_text", f"Advanced {req.skill_name} Question").strip()
                code_snip = q.get("code_snippet", "")
                if code_snip:
                    clean_txt += f"\n\n```python\n{code_snip}\n```"
                topic = q.get("topic", "General")
                q_fp = generate_canonical_fingerprint(clean_txt)
                insert_data.append({
                    "skill_name": req.skill_name,
                    "difficulty_level": target_diff,
                    "question_base_text": clean_txt,
                    "options_json": {"choices": opts, "topic": topic, "fingerprint": q_fp},
                    "correct_answer": correct_ans
                })
            if insert_data:
                inserted = supabase.table("questions").insert(insert_data).execute()
                if hasattr(inserted, 'data') and inserted.data:
                    available_questions = inserted.data

        if not available_questions:
            raise HTTPException(status_code=500, detail="Unable to generate new unique question at this time. Please retry.")

        # 4. Pick a question
        chosen_q = random.choice(available_questions)
        
        # 5. Anti-plagiarism / Cheating: Shuffle choices dynamically
        options_data = chosen_q.get('options_json', {})
        if isinstance(options_data, dict) and "choices" in options_data:
            options = list(options_data["choices"])
            topic = options_data.get("topic", "General")
        elif isinstance(options_data, list):
            options = list(options_data)
            topic = "General"
        else:
            options = ["Option A", "Option B", "Option C", "Option D"]
            topic = "General"
            
        random.shuffle(options)

        # 6. Anti-Cheat & Retention: Mark as seen IMMEDIATELY upon fetch so retakes never see it
        if req.student_id:
            try:
                supabase.table("student_seen_questions").insert({
                    "student_id": req.student_id,
                    "skill_name": req.skill_name,
                    "question_id": chosen_q['id']
                }).execute()
            except Exception as se:
                print("Notice recording student_seen_question:", se)

        # 7. Speculative Pre-Generation: While the student reads and solves this question,
        # pre-generate candidate questions for the next possible ranks in the background!
        background_tasks.add_task(speculative_pregeneration_task, req.skill_name, target_diff, req.student_id)

        return {
            "question_id": str(chosen_q['id']),
            "difficulty_level": chosen_q['difficulty_level'],
            "question_text": chosen_q['question_base_text'],
            "options": options,
            "topic": topic
        }

    except HTTPException:
        raise
    except Exception as e:
        print("Error getting question:", e)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/submit-answer")
def submit_answer(req: SubmitAnswerRequest, background_tasks: BackgroundTasks):
    try:
        # 1. Fetch correct answer from DB
        q_res = supabase.table("questions").select("correct_answer, question_base_text").eq("id", req.question_id).execute()
        if not q_res.data:
            # Fallback search if question_id was formatted differently
            fallback_res = supabase.table("questions").select("correct_answer, question_base_text").ilike("skill_name", req.skill_name).limit(1).execute()
            if fallback_res.data:
                q_res = fallback_res
            else:
                raise HTTPException(status_code=404, detail="Question not found")
            
        correct_ans = q_res.data[0]['correct_answer']
        
        # 2. Check if correct
        is_correct = (req.selected_option.strip() == correct_ans.strip())
        
        # 3. Adaptive Logic: Adjust next difficulty
        curr_diff = req.current_difficulty or 1
        if is_correct:
            next_difficulty = min(5, curr_diff + 1)
        else:
            next_difficulty = max(1, curr_diff - 1)
            
        # Spawn background task to speculatively pre-generate for next_difficulty and its neighbors
        background_tasks.add_task(speculative_pregeneration_task, req.skill_name, next_difficulty, req.student_id)
        
        # Fast Explanation Generation with safe fallback
        try:
            explanation = generate_explanation_fast(
                skill_name=req.skill_name,
                question_text=q_res.data[0].get('question_base_text', ''),
                options=[],
                correct_answer=correct_ans
            )
        except Exception as expl_err:
            print(f"[submit_answer] Fast explanation fallback used: {expl_err}")
            explanation = f"The correct answer is '{correct_ans}'."
            
        return {
            "is_correct": is_correct,
            "correct_answer": correct_ans,
            "next_difficulty": next_difficulty,
            "explanation": explanation
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
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

        # Parse difficulty level cleanly
        if str(req.difficulty_type) in ["1", "2", "3"]:
            difficulty_level = 4
        elif str(req.difficulty_type) in ["4", "5"]:
            difficulty_level = int(req.difficulty_type)
        else:
            difficulty_level = 4 if str(req.difficulty_type).lower() == "basic" else 5

        selected_q = None
        seen_ids = set()
        seen_texts = set()
        
        if req.student_id:
            # Fetch seen coding questions for this student
            try:
                seen_res = supabase.table("student_seen_coding_questions").select("coding_question_id").eq("student_id", req.student_id).execute()
                if hasattr(seen_res, 'data') and seen_res.data:
                    seen_ids = set(str(r['coding_question_id']) for r in seen_res.data)
                    if seen_ids:
                        coding_texts_res = supabase.table("coding_questions").select("question_base_text").in_("id", list(seen_ids)[:200]).execute()
                        if hasattr(coding_texts_res, 'data') and coding_texts_res.data:
                            seen_texts = set(r.get("question_base_text", "").strip() for r in coding_texts_res.data if r.get("question_base_text"))
            except Exception as se:
                print("Error loading student_seen_coding_questions:", se)
        
        # Fetch questions matching skill and difficulty
        all_q_res = supabase.table("coding_questions").select("*").ilike("skill_name", req.skill_name).eq("difficulty_level", difficulty_level).execute()
        if not (hasattr(all_q_res, 'data') and all_q_res.data):
            # Fallback: check any difficulty for this skill
            all_q_res = supabase.table("coding_questions").select("*").ilike("skill_name", req.skill_name).execute()
        
        if hasattr(all_q_res, 'data') and all_q_res.data:
            unseen_qs = []
            for q in all_q_res.data:
                qid = str(q.get('id', ''))
                qtxt = q.get('question_base_text', '').strip()
                if qid in seen_ids or qtxt in seen_texts or is_duplicate_context(qtxt, seen_texts):
                    continue
                unseen_qs.append(q)
            
            if unseen_qs:
                selected_q = random.choice(unseen_qs)
            elif all_q_res.data:
                # If all have been seen, pick least used
                selected_q = random.choice(all_q_res.data)
                
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
    violation_details: list[dict] = []
    tab_switch_strikes: int = 0
    webcam_strikes: int = 0
    voice_strikes: int = 0

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
        import os
        import json
        from datetime import datetime, timezone

        analytics = analyze_performance(req.skill_name, req.history)
        
        # Categorized 3-Strike Threshold Calculation
        # For each category: Strikes 1, 2, 3 are warning strikes. Only strikes > 3 increment penalty flags!
        tab_penalty_flags = max(0, req.tab_switch_strikes - 3)
        webcam_penalty_flags = max(0, req.webcam_strikes - 3)
        voice_penalty_flags = max(0, req.voice_strikes - 3)

        # Fallback if raw violation_details passed without specific strike counts
        if req.tab_switch_strikes == 0 and req.webcam_strikes == 0 and req.voice_strikes == 0 and req.violation_details:
            tab_raw = sum(1 for v in req.violation_details if v.get("category") == "tab_switch" or v.get("type") in ["tab_switch", "window_blur", "screenshot_attempt"])
            webcam_raw = sum(1 for v in req.violation_details if v.get("category") == "webcam_issue" or v.get("type") in ["multiple_faces", "no_face", "blind_spot_gaze", "camera_tilt"])
            voice_raw = sum(1 for v in req.violation_details if v.get("category") == "voice_leak" or v.get("type") == "audio_leak")
            tab_penalty_flags = max(0, tab_raw - 3)
            webcam_penalty_flags = max(0, webcam_raw - 3)
            voice_penalty_flags = max(0, voice_raw - 3)

        # Itemized Cheating & Proctoring Violation Detection
        mobile_violations = [v for v in (req.violation_details or []) if v.get("type") == "mobile_phone"]
        assistant_violations = [v for v in (req.violation_details or []) if v.get("type") == "multiple_faces"]
        voice_violations = [v for v in (req.violation_details or []) if v.get("type") == "audio_leak"]

        cheating_incidents = []
        total_cheating_gli_penalty = 0

        # 1. Mobile Phone / Camera / Electronic Gadget photo-capture attempts (-25 pts each)
        if len(mobile_violations) > 0:
            deduction = 25 * min(3, len(mobile_violations))
            total_cheating_gli_penalty += deduction
            cheating_incidents.append({
                "label": f"Cheating Detected: Mobile Phone / Gadget — {req.skill_name}",
                "detail": f"{len(mobile_violations)} unauthorized mobile device / gadget photo scan(s) identified in camera during exam",
                "pts": -deduction,
                "type": "integrity_penalty",
                "icon": "smartphone",
                "color": "rose"
            })

        # 2. Unauthorized Human Assistant / Multiple Persons detected in camera frame (-25 pts each)
        if len(assistant_violations) > 0:
            deduction = 25 * min(3, len(assistant_violations))
            total_cheating_gli_penalty += deduction
            cheating_incidents.append({
                "label": f"Cheating Detected: Unauthorized Human Assistant — {req.skill_name}",
                "detail": f"{len(assistant_violations)} instance(s) of external person / assistant detected in camera frame assisting candidate",
                "pts": -deduction,
                "type": "integrity_penalty",
                "icon": "users",
                "color": "rose"
            })

        # 3. Audio / Voice Assistant Answering Leak (-20 pts each)
        if len(voice_violations) > 0:
            deduction = 20 * min(3, len(voice_violations))
            total_cheating_gli_penalty += deduction
            cheating_incidents.append({
                "label": f"Audio Leak: External Voice / Assistant Speaking — {req.skill_name}",
                "detail": f"{len(voice_violations)} incident(s) of assistant answering or candidate verbalizing questions detected",
                "pts": -deduction,
                "type": "integrity_penalty",
                "icon": "mic-off",
                "color": "rose"
            })

        # 4. Excess Tab Switching beyond 3 strikes (-15 pts per flag)
        if tab_penalty_flags > 0:
            deduction = 15 * tab_penalty_flags
            total_cheating_gli_penalty += deduction
            cheating_incidents.append({
                "label": f"Proctoring Violation: Tab Interruption Limit Exceeded — {req.skill_name}",
                "detail": f"{tab_penalty_flags} penalty flag(s) for leaving examination window beyond the 3-strike warning limit",
                "pts": -deduction,
                "type": "integrity_penalty",
                "icon": "shield-alert",
                "color": "rose"
            })

        # Calculate Competency Exam Score Deduction from Cheating
        score_penalty = min(75, int(total_cheating_gli_penalty * 0.75))
        effective_score = max(0, req.score_percentage - score_penalty)

        # Severe academic malpractice prevents passing the assessment
        has_severe_cheating = (len(mobile_violations) > 0 or len(assistant_violations) > 0 or total_cheating_gli_penalty >= 35)

        # Persist Negative Integrity Deductions into Ledger for GLI History
        if cheating_incidents and req.student_id:
            try:
                ledger_file = os.path.join(os.path.dirname(__file__), "..", "integrity_ledger.json")
                ledger = []
                if os.path.exists(ledger_file):
                    try:
                        with open(ledger_file, "r") as f:
                            ledger = json.load(f)
                    except Exception:
                        ledger = []

                now_iso = datetime.now(timezone.utc).isoformat()
                now_ts = int(datetime.now(timezone.utc).timestamp())
                for idx, inc in enumerate(cheating_incidents):
                    inc_record = {
                        "id": f"penalty_{req.student_id}_{now_ts}_{idx}",
                        "student_id": req.student_id,
                        "type": "integrity_penalty",
                        "skill_name": req.skill_name,
                        "icon": inc.get("icon", "shield-alert"),
                        "label": inc["label"],
                        "detail": inc["detail"],
                        "pts": inc["pts"],
                        "color": inc.get("color", "rose"),
                        "date": now_iso
                    }
                    ledger.append(inc_record)

                with open(ledger_file, "w") as f:
                    json.dump(ledger, f, indent=2)
            except Exception as log_err:
                print("Failed to persist integrity deduction to ledger:", log_err)

        if total_cheating_gli_penalty > 0:
            analytics += (
                f"\n\n**PROCTORING INTEGRITY AUDIT:** Academic malpractice or proctoring breaches detected during examination. "
                f"Assessment score was penalized by -{score_penalty}% (Effective score: {effective_score}%). "
                f"A negative integrity deduction of -{total_cheating_gli_penalty} pts was recorded in your Global Learner Index (GLI) ledger."
            )
            if has_severe_cheating:
                analytics += "\n\n⚠️ **ACADEMIC MALPRACTICE NOTICE:** Severe proctoring breach detected (mobile device / unauthorized human assistant). Level 1 verification failed."

        if effective_score >= 60 and not has_severe_cheating:
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
