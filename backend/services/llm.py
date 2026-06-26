import os
from groq import Groq
from dotenv import load_dotenv
import json

load_dotenv()

# We use Groq because the API key is already present in .env
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

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
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
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


def generate_questions(skill_name: str, count: int = 5, seen_topics: list = None, target_difficulty: int = 1) -> list:
    """
    Generates technical MCQs for a specific skill and difficulty level using Groq (llama3).
    """
    seen_context = ""
    if seen_topics:
        seen_context = f"\nCRITICAL: Do NOT generate questions about these topics as the user has already seen them recently: {', '.join(seen_topics)}.\nGenerate highly unique and diverse questions covering other areas of {skill_name}."
        
    diff_desc = {
        1: "Level 1 (Beginner): Fundamentals, basic syntax, and simple concepts.",
        2: "Level 2 (Novice): Common use cases, standard standard library functions, and basic problem solving.",
        3: "Level 3 (Intermediate): Advanced features, best practices, and architecture principles.",
        4: "Level 4 (Advanced): Complex scenarios, performance optimization, and deep underlying mechanics.",
        5: "Level 5 (Expert): Edge cases, deep internals, highly obscure nuances, and system design."
    }
    diff_string = diff_desc.get(target_difficulty, diff_desc[1])
    
    advanced_enforcement = ""
    if target_difficulty >= 4:
        advanced_enforcement = f"""
        CRITICAL FOR LEVEL {target_difficulty}: You MUST generate extremely advanced, obscure, and complex questions suitable for a Senior/Staff engineer. 
        DO NOT generate 'Hello World', basic slicing, or simple syntax questions. If you generate a simple question, you have failed.
        Include complex `code_snippet`s focusing on edge cases, memory management, algorithmic complexity, or deep system internals.
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
    
    Output strictly as a JSON array of objects with the following keys:
    - "question_base_text": The complete question string.
    - "code_snippet": The code snippet required for the question. If no code is needed, use an empty string "".
    - "options": An array of EXACTLY 4 distinct strings (the multiple choices). You MUST provide exactly 4 options. Do not provide 3 or 5.
    - "correct_answer": The exact string of the correct option. MUST be exactly one of the strings in the "options" array.
    - "difficulty": Must be EXACTLY the number {target_difficulty}.
    - "topic": A sub-topic string (e.g., "Hooks" for React, "ORM" for Django).
    
    Example format:
    [
      {{
        "question_base_text": "What is the purpose of useEffect in React?",
        "options": ["Handling side effects", "Defining state", "Routing", "Styling components"],
        "correct_answer": "Handling side effects",
        "difficulty": 2,
        "topic": "Hooks"
      }}
    ]
    
    Return ONLY the valid JSON array. Do not include markdown formatting like ```json.
    """
    
    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            response_format={"type": "json_object"}
        )
        
        raw_content = response.choices[0].message.content
        
        # Groq with JSON mode expects an object, so we wrap the array in the prompt ideally, 
        # but let's parse it manually if it returns an array.
        try:
            data = json.loads(raw_content)
            qs = []
            if isinstance(data, dict):
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
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
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
            for k, v in data.items():
                if isinstance(v, list):
                    return v
        return data
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
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
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
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
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
    Generate ONE programming problem to test a candidate's practical coding ability in '{skill_name}'.
    The difficulty should be '{difficulty_type}'.
    
    Output strictly as a JSON object with:
    - "question_base_text": The problem statement, requirements, and examples (use markdown if needed).
    - "starter_code": A template or function signature for the candidate to start with (e.g., "def fibonacci(n):\n    # Your code here").
    - "correct_answer": A reference solution or key aspects you look for (not shown to candidate).
    - "difficulty": 4 if basic, 5 if conceptual.
    - "topic": The specific concept being tested.
    
    Return ONLY the valid JSON object.
    """
    
    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            response_format={"type": "json_object"}
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        print("JSON mode failed, retrying without JSON mode:", e)
        try:
            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
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
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
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
            
            test_res = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
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
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
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
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print("Failed to generate project idea:", e)
        return f"Build a comprehensive, full-stack application using {skill_name} that includes authentication, a database, and a complex domain logic feature (like real-time updates or advanced data processing)."
