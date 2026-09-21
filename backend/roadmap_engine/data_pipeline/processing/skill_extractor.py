import re
from typing import List

# MVP Level 1: Dictionary-based extraction
# Later phases will replace this with spaCy/NLP
KNOWN_SKILLS = [
    "python", "java", "javascript", "react", "angular", "vue",
    "django", "fastapi", "flask", "node.js", "express",
    "sql", "postgresql", "mysql", "mongodb", "redis",
    "docker", "kubernetes", "aws", "azure", "gcp",
    "git", "ci/cd", "linux", "typescript", "c++", "c#",
    "machine learning", "data analysis", "pandas", "numpy",
    "cybersecurity", "penetration testing", "network security"
]

class SkillExtractor:
    """
    Extracts technical skills from raw job descriptions.
    """
    
    def __init__(self):
        # Compile regex patterns for fast lookup
        # \b ensures word boundaries so 'java' doesn't match 'javascript'
        self.patterns = {
            skill: re.compile(r'\b' + re.escape(skill) + r'\b', re.IGNORECASE)
            for skill in KNOWN_SKILLS
        }

    def extract_skills(self, job_description: str) -> List[str]:
        """
        Takes raw JD text and returns a list of extracted skills (lowercase).
        """
        extracted = []
        for skill, pattern in self.patterns.items():
            if pattern.search(job_description):
                extracted.append(skill)
        return extracted
