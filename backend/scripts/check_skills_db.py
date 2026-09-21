from database import supabase

res = supabase.table("skill_knowledge_graph").select("normalized_name").execute()
skills = [r["normalized_name"] for r in res.data]
print("Total skills in DB:", len(skills))
print("Data Science skills present:", any(s in skills for s in ["Pandas", "NumPy", "Scikit-learn", "PyTorch", "TensorFlow"]))
print("All skills:", skills)
