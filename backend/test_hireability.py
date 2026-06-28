import json
from datetime import datetime, timedelta, timezone
from services.hireability import calculate_hireability_index

# Student A: Quiz Taker (5 skills, all Level 1, 80%, done 12 months ago)
twelve_months_ago = (datetime.now(timezone.utc) - timedelta(days=365)).isoformat()
student_a_skills = [
    {"skill_name": "html", "verification_level": 1, "skill_score": 80, "updated_at": twelve_months_ago},
    {"skill_name": "css", "verification_level": 1, "skill_score": 80, "updated_at": twelve_months_ago},
    {"skill_name": "javascript", "verification_level": 1, "skill_score": 80, "updated_at": twelve_months_ago},
    {"skill_name": "python", "verification_level": 1, "skill_score": 80, "updated_at": twelve_months_ago},
    {"skill_name": "java", "verification_level": 1, "skill_score": 80, "updated_at": twelve_months_ago},
]

# Student B: The Builder (2 skills, React & Node.js, Level 2, 80%, done 2 months ago, active spread)
two_months_ago = (datetime.now(timezone.utc) - timedelta(days=60)).isoformat()
three_months_ago = (datetime.now(timezone.utc) - timedelta(days=90)).isoformat()
student_b_skills = [
    {"skill_name": "react", "verification_level": 2, "skill_score": 80, "updated_at": two_months_ago},
    {"skill_name": "node.js", "verification_level": 2, "skill_score": 80, "updated_at": three_months_ago}, # Spread of 30 days
]

print("=== Student A (Quiz Taker) ===")
res_a = calculate_hireability_index(student_a_skills)
print(json.dumps(res_a, indent=2))

print("\n=== Student B (Builder) ===")
res_b = calculate_hireability_index(student_b_skills)
print(json.dumps(res_b, indent=2))
