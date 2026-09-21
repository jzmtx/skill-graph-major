"""
Batch replace all deprecated Groq model strings across backend services.
Run once from d:/skillgraph/backend/
"""
import os

FILES = [
    "services/llm.py",
    "services/resource_engine.py",
    "services/blueprint_engine.py",
    "services/chat_service.py",
    "services/industry_engine.py",
    "services/knowledge_fusion.py",
    "services/normalization.py",
    "services/roadmap_engine.py",
]

# Import line to prepend to files that use the constants
IMPORT_LINE = "from groq_models import GROQ_PRIMARY, GROQ_FAST\n"

REPLACEMENTS = {
    '"llama-3.3-70b-versatile"': 'GROQ_PRIMARY',
    '"llama-3.1-8b-instant"':    'GROQ_FAST',
    # knowledge_fusion uses a variable assignment style
    '= "llama-3.1-8b-instant"': '= GROQ_FAST',
}

for filepath in FILES:
    if not os.path.exists(filepath):
        print(f"  SKIP (not found): {filepath}")
        continue
    
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    original = content
    for old, new in REPLACEMENTS.items():
        content = content.replace(old, new)
    
    # Add import line if we made any replacements and it's not already there
    if content != original and "from groq_models import" not in content:
        content = IMPORT_LINE + content
    
    if content != original:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"  UPDATED: {filepath}")
    else:
        print(f"  NO CHANGE: {filepath}")

print("\nAll files processed.")
