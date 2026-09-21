import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_KEY'))

skills = [
    {"normalized_name": "NumPy", "aliases": ["numpy", "num py"], "category": "Data Science Library"},
    {"normalized_name": "Pandas", "aliases": ["pandas"], "category": "Data Science Library"},
    {"normalized_name": "Seaborn", "aliases": ["seaborn"], "category": "Data Science Library"},
    {"normalized_name": "Matplotlib", "aliases": ["matplotlib"], "category": "Data Science Library"},
    {"normalized_name": "Scikit-Learn", "aliases": ["scikit-learn", "sklearn", "scikit learn"], "category": "Machine Learning Library"},
    {"normalized_name": "TensorFlow", "aliases": ["tensorflow", "tf"], "category": "Machine Learning Library"},
    {"normalized_name": "PyTorch", "aliases": ["pytorch", "torch"], "category": "Machine Learning Library"},
    {"normalized_name": "Tableau", "aliases": ["tableau"], "category": "Concept"},
    {"normalized_name": "Power BI", "aliases": ["power bi", "powerbi"], "category": "Concept"},
    {"normalized_name": "Excel", "aliases": ["excel", "ms excel", "microsoft excel"], "category": "Concept"},
    {"normalized_name": "SQL", "aliases": ["sql"], "category": "Programming Language"},
    {"normalized_name": "Apache Kafka", "aliases": ["kafka", "apache kafka"], "category": "DevOps & Tools"},
    {"normalized_name": "Apache Spark", "aliases": ["spark", "apache spark"], "category": "DevOps & Tools"},
    {"normalized_name": "Hadoop", "aliases": ["hadoop", "apache hadoop"], "category": "DevOps & Tools"}
]

for s in skills:
    try:
        supabase.table("skill_knowledge_graph").upsert(s, on_conflict="normalized_name").execute()
        print(f"Seeded: {s['normalized_name']}")
    except Exception as e:
        print(f"Failed to seed {s['normalized_name']}: {e}")

print("Done seeding data skills.")
