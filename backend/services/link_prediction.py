import networkx as nx
from database import supabase

def predict_missing_prerequisites():
    """
    Applies graph link prediction algorithms (Adamic-Adar neighborhood overlap)
    on the skill dependency graph to predict potential missing prerequisites.
    """
    # 1. Fetch skills and existing dependencies
    skills_res = supabase.table("skill_knowledge_graph").select("id, normalized_name").execute()
    edges_res = supabase.table("skill_dependencies").select("skill_id, prerequisite_id").execute()
    
    if not skills_res.data:
        return []
        
    skills = skills_res.data
    skill_by_id = {s["id"]: s for s in skills}
    
    # 2. Build Directed and Undirected Graphs
    G = nx.DiGraph()
    for s in skills:
        G.add_node(s["id"])
        
    for edge in edges_res.data:
        u, v = edge["skill_id"], edge["prerequisite_id"]
        # prerequisite -> skill
        G.add_edge(v, u)
        
    uG = G.to_undirected()
    
    # 3. Calculate Adamic-Adar Index on non-existent edges
    non_edges = list(nx.non_edges(uG))
    if not non_edges:
        return []
        
    predictions = []
    try:
        aa_preds = nx.adamic_adar_index(uG, non_edges)
        for u, v, score in aa_preds:
            if score > 0:
                predictions.append((u, v, score))
    except Exception as e:
         print(f"Link prediction calculation failed: {e}")
         return []
         
    # Sort predictions by Adamic-Adar score descending
    predictions = sorted(predictions, key=lambda x: x[2], reverse=True)[:15]
    
    recommended_edges = []
    for u_id, v_id, score in predictions:
        u_skill = skill_by_id.get(u_id)
        v_skill = skill_by_id.get(v_id)
        
        if not u_skill or not v_skill:
            continue
            
        # Determine the logical prerequisite direction based on out-degree
        # The node that is already a prerequisite for more skills (higher out-degree) is the prerequisite
        u_out = G.out_degree(u_id)
        v_out = G.out_degree(v_id)
        
        if u_out >= v_out:
            prereq_id = u_id
            skill_id = v_id
            prereq_name = u_skill["normalized_name"]
            skill_name = v_skill["normalized_name"]
        else:
            prereq_id = v_id
            skill_id = u_id
            prereq_name = v_skill["normalized_name"]
            skill_name = u_skill["normalized_name"]
            
        recommended_edges.append({
            "skill_id": skill_id,
            "skill_name": skill_name,
            "prerequisite_id": prereq_id,
            "prerequisite_name": prereq_name,
            "confidence_score": round(score, 3)
        })
        
    return recommended_edges
