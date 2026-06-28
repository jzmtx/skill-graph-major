import os
import json
from dotenv import load_dotenv

load_dotenv()
from supabase import create_client

supabase = create_client(os.environ['SUPABASE_URL'], os.environ['SUPABASE_KEY'])

output = []

# Fetch MCQs
mcqs = supabase.table('questions').select('*').execute()
output.append("## Multiple Choice Questions (Level 1)")
for q in mcqs.data:
    output.append(f"**Skill**: {q.get('skill_name')} | **Difficulty**: {q.get('difficulty_level')}")
    output.append(f"**Question**: {q.get('question_base_text')}")
    output.append(f"**Options**: {q.get('options_json')}")
    output.append(f"**Correct Answer**: {q.get('correct_answer')}\n---")

# Fetch Coding Questions
coding_qs = supabase.table('coding_questions').select('*').execute()
output.append("\n## Coding Questions (Level 1 / 2)")
for q in coding_qs.data:
    output.append(f"**Skill**: {q.get('skill_name')} | **Difficulty Type**: {q.get('difficulty_type')}")
    output.append(f"**Question**: {q.get('question_base_text')}")
    output.append(f"**Starter Code**:\n```javascript\n{q.get('starter_code', '')}\n```")
    output.append(f"**Verification Guidelines**: {q.get('verification_guidelines')}\n---")

# Write to artifact
artifact_path = r"D:\skillgraph\db_questions.md"
with open(artifact_path, "w", encoding="utf-8") as f:
    f.write("\n".join(output))

print(f"Successfully dumped questions to {artifact_path}")
