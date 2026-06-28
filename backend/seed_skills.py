import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_KEY'))

skills = [
    {"normalized_name": "Python", "aliases": ["python", "python3"]},
    {"normalized_name": "Pandas", "aliases": ["pandas", "pd"]},
    {"normalized_name": "NumPy", "aliases": ["numpy", "np"]},
    {"normalized_name": "Scikit-learn", "aliases": ["scikit-learn", "sklearn", "scikit learn"]},
    {"normalized_name": "TensorFlow", "aliases": ["tensorflow", "tf"]},
    {"normalized_name": "PyTorch", "aliases": ["pytorch", "torch"]},
    {"normalized_name": "Keras", "aliases": ["keras"]},
    {"normalized_name": "Matplotlib", "aliases": ["matplotlib"]},
    {"normalized_name": "Seaborn", "aliases": ["seaborn"]},
    {"normalized_name": "AWS", "aliases": ["aws", "amazon web services"]},
    {"normalized_name": "Azure", "aliases": ["azure", "microsoft azure"]},
    {"normalized_name": "GCP", "aliases": ["gcp", "google cloud"]},
    {"normalized_name": "Docker", "aliases": ["docker"]},
    {"normalized_name": "Kubernetes", "aliases": ["kubernetes", "k8s"]},
    {"normalized_name": "Spark", "aliases": ["spark", "apache spark", "pyspark"]},
    {"normalized_name": "Hadoop", "aliases": ["hadoop"]},
    {"normalized_name": "Kafka", "aliases": ["kafka", "apache kafka"]},
    {"normalized_name": "Airflow", "aliases": ["airflow", "apache airflow"]},
    {"normalized_name": "Machine Learning", "aliases": ["machine learning", "ml"]},
    {"normalized_name": "Deep Learning", "aliases": ["deep learning", "dl"]},
    {"normalized_name": "NLP", "aliases": ["nlp", "natural language processing"]},
    {"normalized_name": "Computer Vision", "aliases": ["computer vision", "cv"]},
    {"normalized_name": "SQL", "aliases": ["sql", "mysql", "postgresql", "postgres"]},
    {"normalized_name": "Tableau", "aliases": ["tableau"]},
    {"normalized_name": "PowerBI", "aliases": ["powerbi", "power bi"]},
    {"normalized_name": "Java", "aliases": ["java"]},
    {"normalized_name": "C++", "aliases": ["c++", "cpp"]},
    {"normalized_name": "Scala", "aliases": ["scala"]},
    {"normalized_name": "R", "aliases": ["r", "r studio", "rstudio"]},
    {"normalized_name": "Data Modeling", "aliases": ["data modeling", "data architecture"]},
    {"normalized_name": "Snowflake", "aliases": ["snowflake"]},
    {"normalized_name": "Databricks", "aliases": ["databricks"]},
    {"normalized_name": "Redshift", "aliases": ["redshift", "amazon redshift"]},
    {"normalized_name": "BigQuery", "aliases": ["bigquery", "google bigquery"]}
]

for s in skills:
    try:
        supabase.table("skill_knowledge_graph").upsert(s, on_conflict="normalized_name").execute()
    except Exception as e:
        print(e)
print("Seeded skills!")
