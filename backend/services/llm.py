from groq_models import GROQ_PRIMARY, GROQ_FAST, GROQ_FALLBACK_CHAIN
import os
from groq import Groq
from dotenv import load_dotenv, dotenv_values
import json
import random

load_dotenv()

env_vars = dotenv_values(".env")
keys_str = env_vars.get("GROQ_API_KEYS", env_vars.get("GROQ_API_KEY", ""))
key_list = [k.strip() for k in keys_str.split(",") if k.strip()]
_current_key_idx = 0
client = Groq(api_key=key_list[_current_key_idx] if key_list else None)

is_programmable_cache = {}

def is_skill_programmable(skill_name: str) -> bool:
    if skill_name in is_programmable_cache:
        return is_programmable_cache[skill_name]
    
    prompt = f"Does the technical skill '{skill_name}' involve writing syntax code (like Python, Java, SQL, React)? Answer exactly 'YES' or 'NO'."
    try:
        res = call_groq_with_retries(
            model=GROQ_FAST,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1
        )
        ans = res.choices[0].message.content.strip().upper()
        result = 'YES' in ans
        is_programmable_cache[skill_name] = result
        return result
    except Exception as e:
        print("Error checking if skill is programmable:", e)
        return True # Default to True to preserve original behavior if error

def call_groq_with_retries(**kwargs):
    global client, _current_key_idx
    import time
    from groq import Groq
    
    current_kwargs = dict(kwargs)
    requested_model = current_kwargs.get("model", GROQ_PRIMARY)
    
    # Candidate models in order: requested model first, then remainder of fallback chain
    model_candidates = [requested_model]
    for fb in GROQ_FALLBACK_CHAIN:
        if fb not in model_candidates:
            model_candidates.append(fb)
            
    model_idx = 0
    max_retries = 6
    last_exception = None
    
    for attempt in range(max_retries):
        try:
            current_kwargs["model"] = model_candidates[model_idx % len(model_candidates)]
            return client.chat.completions.create(**current_kwargs)
        except Exception as e:
            last_exception = e
            error_str = str(e).lower()
            current_model_used = current_kwargs.get('model')
            print(f"Groq API Error on model '{current_model_used}': {e}. Retrying ({attempt+1}/{max_retries})...")
            
            # Case 1: JSON schema validation error (400 json_validate_failed)
            # Remove response_format so Groq does not reject the response; Python json.loads handles parsing
            if 'json_validate_failed' in error_str or ('400' in error_str and 'json' in error_str):
                if 'response_format' in current_kwargs:
                    print("Bypassing strict json_object response_format on retry...")
                    current_kwargs.pop('response_format', None)
                    time.sleep(0.3)
                    continue
            
            # Case 2: Rate limit (429), token limit (otpm/tpm), or temporary server error (500/503)
            if '429' in error_str or 'rate limit' in error_str or 'token' in error_str or '500' in error_str or '503' in error_str:
                # Rotate API key quickly
                if key_list and len(key_list) > 1:
                    _current_key_idx = (_current_key_idx + 1) % len(key_list)
                    next_key = key_list[_current_key_idx]
                    client = Groq(api_key=next_key)
                    print(f"Quick-rotated Groq API key to slot {_current_key_idx+1}/{len(key_list)}.")
                
                # Advance model fallback if it's a rate limit or token limit
                model_idx += 1
                next_model = model_candidates[model_idx % len(model_candidates)]
                print(f"Switched model candidate to '{next_model}' to bypass rate limits.")
                time.sleep(0.4)
                continue
            
            # Flush connection pool for standard connection resets
            client = Groq(api_key=client.api_key)
            time.sleep(0.4)
            
    if last_exception:
        raise last_exception


def verify_questions(skill_name: str, questions: list) -> list:
    """
    Validates and corrects MCQs to ensure the correct_answer is truly correct.
    """
    if not questions:
        return []
        
    prompt = f"""
    You are a strict technical validator for '{skill_name}' questions.
    I will provide a JSON array of multiple choice questions.
    For each question, analyze the question text, code snippet, and options.
    CRITICAL: If the question contains a code snippet, you MUST mentally trace the code line-by-line to determine the exact, strictly correct output.
    If the "correct_answer" is WRONG, change it to the actual correct option among the 4 choices.
    If none of the options are correct, replace one of the options with the exact true correct answer and set it as correct.
    Ensure that the "options" array ALWAYS contains EXACTLY 4 distinct strings. Never remove an option without replacing it.
    Return the corrected JSON array of objects with the exact same structure.
    
    Questions to verify:
    {json.dumps(questions, indent=2)}
    
    Return ONLY the valid JSON array without markdown formatting.
    """
    try:
        response = call_groq_with_retries(
            model=GROQ_PRIMARY,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            response_format={"type": "json_object"}
        )
        data = json.loads(response.choices[0].message.content)
        if isinstance(data, dict):
            for k, v in data.items():
                if isinstance(v, list):
                    return v
            return [data]
        if isinstance(data, list):
            return data
    except Exception as e:
        print("Validator failed, returning original questions:", e)
    return questions


def generate_questions(skill_name: str, count: int = 5, seen_topics: list = None, target_difficulty: int = 1, target_topics: list = None) -> list:
    """
    Generates technical MCQs for a specific skill and difficulty level using Groq (llama3).
    """
    seen_context = ""
    if seen_topics and not target_topics:
        seen_context = f"\nCRITICAL: Do NOT generate questions about these topics as the user has already seen them recently: {', '.join(seen_topics)}.\nGenerate highly unique and diverse questions covering other areas of {skill_name}."
        
    topic_context = ""
    if target_topics:
        topic_context = f"\nCRITICAL TOPIC ENFORCEMENT: You MUST generate questions exclusively focused on the following specific sub-topics of {skill_name}: {', '.join(target_topics)}.\nDo NOT generate generic {skill_name} questions."
        
    diff_desc = {
        1: "Level 1 (Beginner): Core syntax, fundamental definitions, elementary keywords, and basic data types.",
        2: "Level 2 (Elementary): Standard library functions, collection transformations, basic error handling, and idiomatic patterns.",
        3: "Level 3 (Intermediate): Design patterns, closure scope, asynchronous promises/coroutines, state management, and practical debugging.",
        4: "Level 4 (Advanced): Complex execution order, concurrency race conditions, memory profiling, and runtime lifecycle hooks.",
        5: "Level 5 (Expert / Principal Engineer): Deep language internals, obscure runtime mechanics, bytecode/memory layouts, metaclasses/descriptors, and subtle multi-step code traps."
    }
    diff_string = diff_desc.get(target_difficulty, diff_desc[1])
    
    advanced_enforcement = ""
    if target_difficulty == 5:
        advanced_enforcement = f"""
        CRITICAL FOR LEVEL 5 (EXPERT / PRINCIPAL ENGINEER LEVEL):
        - Questions MUST require rigorous, line-by-line mental tracing of complex, non-trivial code snippets containing subtle corner cases, mutation traps, execution order nuances, or runtime internals.
        - BASIC TRIVIA, DEFINITIONS, AND SIMPLE CODE (e.g. 'What is X?', 'Which keyword is used for Y?') ARE STRICTLY FORBIDDEN. If you generate a basic question, it is an automatic failure.
        - In Python: Focus on CPython memory/GIL semantics, metaclass instantiation order (__new__ vs __init__), generator send()/throw() state machines, descriptor protocol precedence, subtle asyncio cancellation leak traps.
        - In JavaScript/TypeScript: Focus on event loop microtask vs macrotask execution orders, prototype shadowing edge cases, deep generic mapped/conditional infer type gymnastics, closure memory leak traps.
        - In React: Focus on fiber reconciliation tearing, concurrent mode transitions, closure staleness traps across re-renders, useLayoutEffect vs useEffect flushing timing.
        - Every question MUST include a realistic, challenging `code_snippet`. Every option must be technical, subtle, and require genuine mastery to distinguish from the correct answer.
        """
    elif target_difficulty == 4:
        advanced_enforcement = f"""
        CRITICAL FOR LEVEL 4 (ADVANCED):
        - Focus on advanced production architecture, performance bottlenecks, concurrency, and non-trivial lifecycle mechanics.
        - Include realistic multi-line `code_snippet`s testing practical debugging and subtle runtime behaviors.
        - Avoid beginner syntax or simple trivia.
        """

    prompt = f"""
    You are an expert technical interviewer and software engineer.
    Generate {count} multiple choice questions (MCQs) to test a candidate's proficiency in '{skill_name}'.
    The questions should be a mix of conceptual and practical code-based scenarios.
    
    CRITICAL DIFFICULTY ENFORCEMENT:
    You MUST strictly generate questions at {diff_string}.
    Do NOT generate a mix of difficulties. ALL {count} questions must be exactly difficulty level {target_difficulty}.
    {advanced_enforcement}
    {seen_context}
    {topic_context}
    
    Output strictly as a valid JSON object with a single key "questions" containing a list of question objects:
    {{
      "questions": [
        {{
          "question_base_text": "What is the purpose of useEffect in React?",
          "code_snippet": "",
          "options": ["Handling side effects", "Defining state", "Routing", "Styling components"],
          "correct_answer": "Handling side effects",
          "difficulty": {target_difficulty},
          "topic": "Hooks"
        }}
      ]
    }}
    
    IMPORTANT RULES:
    - Every question MUST have an "options" array of EXACTLY 4 distinct choices.
    - "correct_answer" must match one of the 4 choices verbatim.
    - Return ONLY the valid JSON object without markdown fences.
    """
    
    try:
        response = call_groq_with_retries(
            model=GROQ_PRIMARY,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            response_format={"type": "json_object"}
        )
        
        raw_content = response.choices[0].message.content
        
        try:
            data = json.loads(raw_content)
            qs = []
            if isinstance(data, dict):
                if "questions" in data and isinstance(data["questions"], list):
                    qs = data["questions"]
                else:
                    for k, v in data.items():
                        if isinstance(v, list):
                            qs = v
                            break
                if not qs:
                    qs = [data]
            elif isinstance(data, list):
                qs = data
            return verify_questions(skill_name, qs)
        except json.JSONDecodeError as e:
            with open("groq_error.txt", "a") as f:
                f.write(f"JSON ERROR: {str(e)}\n")
            print("Failed to parse Groq output:", e)
        
    except Exception as e:
        with open("groq_error.txt", "a") as f:
            f.write(f"JSON ERROR: {str(e)}\n")
        print("Failed to parse Groq output:", e)
        
    # Fallback non-json mode if above fails
    try:
        response = call_groq_with_retries(
            model=GROQ_PRIMARY,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7
        )
        raw_content = response.choices[0].message.content.strip()
        if raw_content.startswith("```json"):
            raw_content = raw_content[7:-3]
        if raw_content.startswith("```"):
            raw_content = raw_content[3:-3]
            
        data = json.loads(raw_content)
        if isinstance(data, dict):
            if "questions" in data and isinstance(data["questions"], list):
                return verify_questions(skill_name, data["questions"])
            for k, v in data.items():
                if isinstance(v, list):
                    return verify_questions(skill_name, v)
            return verify_questions(skill_name, [data])
        elif isinstance(data, list):
            return verify_questions(skill_name, data)
        return []
    except Exception as e:
        with open("groq_error.txt", "a") as f:
            f.write(f"FALLBACK ERROR: {str(e)}\n")
        print("Failed to fallback parse Groq output:", e)
        return []

def analyze_performance(skill_name: str, history: list) -> str:
    if not history:
        return "Keep practicing to establish a baseline."
    
    correct_topics = [h.get('topic', 'General') for h in history if h.get('is_correct')]
    incorrect_topics = [h.get('topic', 'General') for h in history if not h.get('is_correct')]
    
    prompt = f"""
    A candidate has just completed a skill assessment for {skill_name}.
    They answered questions correctly in these topics: {', '.join(correct_topics) if correct_topics else 'None'}
    They answered questions incorrectly in these topics: {', '.join(incorrect_topics) if incorrect_topics else 'None'}
    
    Write a brief 2-3 sentence analysis of their strengths and weaknesses in {skill_name}. Be encouraging but specific. Do not use markdown formatting like asterisks.
    """
    
    try:
        response = call_groq_with_retries(
            model=GROQ_PRIMARY,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print("Error generating analytics:", e)
        return "You have completed the assessment. Review your incorrect topics to improve your score."

def analyze_github_repo(github_url: str, skill_name: str, project_abstract: str) -> dict:
    """
    Analyzes a GitHub repository and generates an interview question based on the code.
    Enforces Software Engineering principles by checking the repo's file tree.
    """
    import requests
    import urllib.parse
    
    file_tree = "Unable to fetch file tree."
    try:
        parsed = urllib.parse.urlparse(github_url)
        parts = parsed.path.strip("/").split("/")
        if len(parts) >= 2:
            owner, repo = parts[0], parts[1]
            api_url = f"https://api.github.com/repos/{owner}/{repo}/contents"
            res = requests.get(api_url, timeout=10)
            if res.status_code == 200:
                files = res.json()
                file_names = [f["name"] for f in files if isinstance(f, dict) and "name" in f]
                file_tree = "\n".join(file_names)
    except Exception as e:
        print("Failed to fetch github tree:", e)
        
    prompt = f"""
    You are a strict senior engineering manager verifying a candidate's {skill_name} project.
    
    Repository: {github_url}
    Candidate's Project Abstract:
    "{project_abstract}"
    
    Repository Root File Tree:
    {file_tree}
    
    First, verify that the project follows basic Software Engineering principles:
    1. A README.md (or similar readme file) MUST exist.
    2. .env files or other blatant credential files MUST NOT be committed to the repo.
    
    If the file tree was successfully fetched and violates these rules, YOU MUST FAIL THEM.
    If they fail, return exactly:
    {{
        "passed_checks": false,
        "feedback": "Your explanation of the violation. E.g., 'You committed a .env file' or 'You are missing a README.md'."
    }}
    
    If they pass (or if the file tree couldn't be fetched, give them the benefit of the doubt), 
    generate ONE highly specific, challenging interview question about their project abstract and {skill_name}.
    The question should be difficult to answer if they just copied the code.
    Return exactly:
    {{
        "passed_checks": true,
        "interview_question": "Your specific interview question here."
    }}
    
    Return ONLY valid JSON. Do not include markdown formatting.
    """
    
    try:
        response = call_groq_with_retries(
            model=GROQ_PRIMARY,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            response_format={"type": "json_object"}
        )
        import json
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        print("Failed to analyze repo:", e)
        return {
            "passed_checks": True, 
            "interview_question": f"Explain a critical architectural decision you made while building this {skill_name} project."
        }

def generate_coding_questions(skill_name: str, difficulty_type: str = "basic") -> dict:
    """
    Generates a coding question for the user to write code.
    difficulty_type can be 'basic' or 'conceptual'
    """
    prompt = f"""
    You are an expert technical interviewer.
    Generate ONE advanced problem to test a candidate's practical ability in '{skill_name}'.
    The difficulty should be '{difficulty_type}'.
    
    CRITICAL: If '{skill_name}' is a programming language or framework (like Python, React, SQL), generate a practical CODING problem.
    However, if '{skill_name}' is a purely theoretical/conceptual skill (like Agile, SDLC, REST API Design, System Architecture), generate an ADVANCED CONCEPTUAL/SYSTEM DESIGN problem where they must write out an architectural response instead of code.
    
    Output strictly as a JSON object with:
    - "question_base_text": The problem statement, requirements, and examples (use markdown if needed).
    - "starter_code": A template or function signature for the candidate to start with (e.g., "def fibonacci(n):\n    # Your code here"). If conceptual, provide a text template like "# Outline your architecture here...".
    - "correct_answer": A reference solution or key aspects you look for (not shown to candidate).
    - "difficulty": 4 if basic, 5 if conceptual.
    - "topic": The specific concept being tested.
    
    Return ONLY the valid JSON object.
    """
    
    try:
        response = call_groq_with_retries(
            model=GROQ_PRIMARY,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            response_format={"type": "json_object"}
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        print("JSON mode failed, retrying without JSON mode:", e)
        try:
            response = call_groq_with_retries(
                model=GROQ_PRIMARY,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7
            )
            raw_content = response.choices[0].message.content.strip()
            if raw_content.startswith("```json"):
                raw_content = raw_content[7:-3]
            elif raw_content.startswith("```"):
                raw_content = raw_content[3:-3]
            return json.loads(raw_content)
        except Exception as e2:
            print("Fallback failed:", e2)
            # Default fallback question so it doesn't crash the assessment
            return {
                "question_base_text": f"Write a simple function in {skill_name} that returns 'Hello World'.",
                "starter_code": f"// Your {skill_name} code here\\n",
                "correct_answer": "return 'Hello World'",
                "difficulty": 4 if difficulty_type == 'basic' else 5,
                "topic": "Basics"
            }

def simulate_code_execution(skill_name: str, code: str) -> str:
    """
    Simulates running the student's code using the Piston API.
    Fallback to LLM if language is not supported or Piston fails.
    """
    import requests
    
    # Map skills to Piston language runtimes
    lang_map = {
        "python": {"language": "python", "version": "3.10.0"},
        "javascript": {"language": "javascript", "version": "18.15.0"},
        "node.js": {"language": "javascript", "version": "18.15.0"},
        "typescript": {"language": "typescript", "version": "5.0.3"},
        "c++": {"language": "c++", "version": "10.2.0"},
        "java": {"language": "java", "version": "15.0.2"},
        "c": {"language": "c", "version": "10.2.0"},
        "go": {"language": "go", "version": "1.16.2"},
        "rust": {"language": "rust", "version": "1.68.2"}
    }
    
    mapped = lang_map.get(skill_name.lower())
    
    if mapped:
        try:
            payload = {
                "language": mapped["language"],
                "version": mapped["version"],
                "files": [{"content": code}],
                "stdin": "",
                "args": [],
                "compile_timeout": 10000,
                "run_timeout": 3000,
                "compile_memory_limit": -1,
                "run_memory_limit": -1
            }
            res = requests.post("https://emkc.org/api/v2/piston/execute", json=payload, timeout=10)
            if res.status_code == 200:
                data = res.json()
                run_res = data.get("run", {})
                compile_res = data.get("compile", {})
                
                output = ""
                if compile_res and compile_res.get("stderr"):
                    output += compile_res["stderr"] + "\n"
                if run_res:
                    output += run_res.get("output", "")
                
                return output.strip() if output.strip() else "Code executed successfully but returned no output."
        except Exception as e:
            print("Piston execution failed, falling back to LLM:", e)

    # Fallback to LLM for unknown languages or network failures
    prompt = f"""
    The user has written the following {skill_name} code:
    ```
    {code}
    ```
    You are a strictly deterministic code execution engine. Simulate running this code.
    If the code has syntax errors or runtime exceptions, output the typical error message.
    Otherwise, output the exact stdout/console output that this code would produce.
    Do not add any conversational text or markdown formatting. Just output the raw console text.
    If the code does not print or output anything, output nothing.
    """
    try:
        response = call_groq_with_retries(
            model=GROQ_PRIMARY,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.0
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print("Simulation error:", e)
        return "Error simulating code execution."

def evaluate_code_submission(skill_name: str, question_text: str, student_code: str) -> dict:
    """
    Evaluates the student's code submission using dynamic Piston test cases.
    Falls back to pure LLM static evaluation for unsupported languages or API failures.
    """
    import json
    import requests

    if not student_code or len(student_code.strip()) < 15:
        return {
            "is_correct": False,
            "feedback": "Your submission is empty or too short. Please write a complete solution."
        }

    lang_map = {
        "python": {"language": "python", "version": "3.10.0"},
        "javascript": {"language": "javascript", "version": "18.15.0"},
        "node.js": {"language": "javascript", "version": "18.15.0"},
        "typescript": {"language": "typescript", "version": "5.0.3"},
        "c++": {"language": "c++", "version": "10.2.0"},
        "java": {"language": "java", "version": "15.0.2"},
        "c": {"language": "c", "version": "10.2.0"},
        "go": {"language": "go", "version": "1.16.2"},
        "rust": {"language": "rust", "version": "1.68.2"}
    }
    
    mapped = lang_map.get(skill_name.lower())
    
    if mapped:
        try:
            # 1. Ask LLM to generate the executable test script
            test_gen_prompt = f"""
            You are a backend test runner. The user is solving the following problem in {skill_name}:
            "{question_text}"
            
            The user provided this code:
            ```
            {student_code}
            ```
            
            Write a complete, runnable script in {skill_name} that includes the user's code exactly as-is, and adds an execution block (like a main function) that runs 3 basic test cases against their logic.
            If ANY test case fails, print a descriptive assertion error and exit.
            If ALL test cases pass, print strictly: "ALL_TESTS_PASSED".
            Output ONLY the raw code. Do not include markdown code blocks or explanations.
            """
            
            test_res = call_groq_with_retries(
                model=GROQ_PRIMARY,
                messages=[{"role": "user", "content": test_gen_prompt}],
                temperature=0.0
            )
            
            test_script = test_res.choices[0].message.content.strip()
            
            # Strip markdown if present
            if test_script.startswith("```"):
                lines = test_script.split("\n")
                if len(lines) > 2:
                    test_script = "\n".join(lines[1:-1])
            
            # 2. Run via Piston
            payload = {
                "language": mapped["language"],
                "version": mapped["version"],
                "files": [{"content": test_script}],
                "stdin": "",
                "args": [],
                "compile_timeout": 10000,
                "run_timeout": 3000,
                "compile_memory_limit": -1,
                "run_memory_limit": -1
            }
            piston_res = requests.post("https://emkc.org/api/v2/piston/execute", json=payload, timeout=15)
            
            if piston_res.status_code == 200:
                data = piston_res.json()
                run_res = data.get("run", {})
                compile_res = data.get("compile", {})
                
                output = ""
                if compile_res and compile_res.get("stderr"):
                    output += compile_res["stderr"] + "\n"
                if run_res:
                    output += run_res.get("output", "")
                
                output = output.strip()
                
                if "ALL_TESTS_PASSED" in output:
                    return {
                        "is_correct": True,
                        "feedback": "All test cases passed successfully! Your code executed correctly on the server."
                    }
                else:
                    return {
                        "is_correct": False,
                        "feedback": f"Execution failed. Console output:\n{output[:350]}"
                    }
        except Exception as e:
            print("Dynamic Piston Execution failed, falling back to static LLM evaluation:", e)

    # Static LLM Fallback (for unsupported languages or Piston failures)
    prompt = f"""
    You are an expert technical interviewer grading a candidate's code submission for '{skill_name}'.
    
    Question Statement:
    {question_text}
    
    Candidate's Code Submission:
    {student_code}
    
    Evaluate the code. Did it solve the problem adequately (conceptually or functionally)?
    Return strictly a JSON object:
    {{
        "is_correct": true or false,
        "feedback": "A short 1-2 sentence feedback to the user explaining why it's correct or incorrect."
    }}
    """
    
    try:
        response = call_groq_with_retries(
            model=GROQ_PRIMARY,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.0,
            response_format={"type": "json_object"}
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        print("Fallback static LLM evaluation failed:", e)
        return {
            "is_correct": False,
            "feedback": "An internal error occurred while evaluating your code."
        }

def generate_project_idea(skill_name: str) -> str:
    """
    Generates a challenging, real-world project idea for Level 2 verification.
    """
    prompt = f"""
    Act as a Senior Engineering Mentor. The candidate wants to prove their advanced proficiency (Level 2) in {skill_name}.
    Recommend a single, highly specific, and challenging real-world project they can build to demonstrate their mastery.
    Keep it concise (3-4 sentences max). Include what core features it must have.
    Do NOT use any markdown formatting, just plain text.
    """
    try:
        response = call_groq_with_retries(
            model=GROQ_PRIMARY,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        return f"Build a comprehensive, full-stack application using {skill_name} that includes authentication, a database, and a complex domain logic feature (like real-time updates or advanced data processing)."

def analyze_github_repo(github_url: str, skill_name: str, project_abstract: str) -> dict:
    import urllib.request
    import re
    import base64
    
    # 1. Extract username/repo
    match = re.search(r'github\.com/([^/]+)/([^/]+)', github_url)
    if not match:
        return {"passed_checks": False, "feedback": "Invalid GitHub URL."}
        
    username, repo = match.group(1), match.group(2)
    repo = repo.replace('.git', '').strip('/')
    
    # 2. Fetch README via GitHub API
    api_url = f"https://api.github.com/repos/{username}/{repo}/readme"
    readme_content = ""
    try:
        req = urllib.request.Request(api_url, headers={'User-Agent': 'SkillGraph-App'})
        with urllib.request.urlopen(req) as response:
            if response.status == 200:
                data = json.loads(response.read().decode())
                if 'content' in data:
                    readme_content = base64.b64decode(data['content']).decode('utf-8')
    except Exception as e:
        print("Failed to fetch README via API:", e)
        # Try raw fallback
        try:
            raw_url = f"https://raw.githubusercontent.com/{username}/{repo}/main/README.md"
            req = urllib.request.Request(raw_url, headers={'User-Agent': 'SkillGraph-App'})
            with urllib.request.urlopen(req) as response:
                if response.status == 200:
                    readme_content = response.read().decode('utf-8')
        except Exception:
            try:
                raw_url = f"https://raw.githubusercontent.com/{username}/{repo}/master/README.md"
                req = urllib.request.Request(raw_url, headers={'User-Agent': 'SkillGraph-App'})
                with urllib.request.urlopen(req) as response:
                    if response.status == 200:
                        readme_content = response.read().decode('utf-8')
            except Exception:
                pass
                
    if not readme_content:
        return {"passed_checks": False, "feedback": "Could not read the repository README. Make sure it is public and has a README.md."}
        
    # 3. Analyze with LLM
    prompt = f"""
    You are a Senior Engineering Assessor.
    We are verifying a candidate's Level 2 proficiency in '{skill_name}'.
    They submitted a GitHub repository for evaluation.
    
    Repository Abstract provided by user:
    {project_abstract}
    
    Repository README.md Content:
    {readme_content[:3000]}
    
    Evaluate this repository. Does it look like a valid project that uses '{skill_name}'? 
    If yes, generate exactly 5 highly specific, difficult anti-plagiarism interview questions about the code they likely wrote based on this README. 
    The questions must be designed to catch someone who just cloned the repo without understanding it.
    - 4 questions should be "conceptual" (architectural choices, edge cases, interactions between files).
    - 1 question MUST be "coding" (ask them to write a specific, small snippet of code extending or modifying a feature mentioned in the repo).
    
    Return strictly a JSON object:
    {{
        "passed_checks": true or false,
        "feedback": "Why it passed or failed",
        "questions": [
            {{
                "id": 1,
                "type": "conceptual",
                "text": "Your conceptual question here"
            }},
            ...
            {{
                "id": 5,
                "type": "coding",
                "text": "Write a snippet that..."
            }}
        ]
    }}
    """
    
    try:
        res = call_groq_with_retries(
            model=GROQ_PRIMARY,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            response_format={"type": "json_object"}
        )
        data = json.loads(res.choices[0].message.content)
        # Ensure 'questions' is present to avoid frontend crashes if LLM hallucinates schema
        if "questions" not in data and "interview_question" in data:
            data["questions"] = [{"id": 1, "type": "conceptual", "text": data["interview_question"]}]
        return data
    except Exception as e:
        print("LLM Error in analyze_github_repo:", e)
        return {"passed_checks": False, "feedback": "Failed to analyze repository with AI."}

def generate_explanation_fast(skill_name: str, question_text: str, options: list, correct_answer: str) -> str:
    """
    Ultra-fast background agent to generate a 1-sentence explanation of why an answer is correct.
    """
    prompt = f"""
    You are an expert technical tutor for '{skill_name}'.
    
    Question: {question_text}
    Options: {', '.join(options)}
    Correct Answer: {correct_answer}
    
    Write EXACTLY ONE concise, friendly sentence explaining WHY the correct answer is correct. 
    Do not use introductory phrases like 'The correct answer is correct because'. 
    Just give the explanation directly.
    """
    try:
        res = call_groq_with_retries(
            model=GROQ_FAST,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3
        )
        return res.choices[0].message.content.strip()
    except Exception as e:
        print("LLM Error in generate_explanation_fast:", e)
        return "This is the correct standard approach for this technology."
