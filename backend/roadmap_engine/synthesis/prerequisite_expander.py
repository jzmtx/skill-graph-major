from typing import List, Set, Dict, Any, Optional
from database import supabase

def expand_prerequisites_recursive(
    target_technology_ids: List[str],
    mastered_skill_ids: List[str] = None,
    role_name: Optional[str] = None
) -> Dict[str, Any]:
    """
    Recursively pulls all prerequisite nodes from learning_prerequisites.
    Excludes already-mastered student skills.
    
    If zero nodes are found and a role_name is provided, triggers the
    curriculum_discovery auto-seeding pipeline and retries once.
    
    Returns:
        nodes: Dict mapping node_id -> node_data
        edges: List of tuples (prereq_id, node_id)
    """
    result = _run_expansion(target_technology_ids, mastered_skill_ids)

    # Auto-discovery fallback: if empty and we know the role
    if not result["nodes"] and role_name:
        print(f"[PrerequisiteExpander] Zero nodes found for role '{role_name}'. Triggering curriculum discovery...")
        try:
            from roadmap_engine.ingestion.curriculum_discovery import auto_discover_and_seed_nodes
            seeded_count = auto_discover_and_seed_nodes(role_name)
            if seeded_count > 0:
                print(f"[PrerequisiteExpander] Retrying expansion after seeding {seeded_count} new nodes...")
                result = _run_expansion(target_technology_ids, mastered_skill_ids)
        except Exception as e:
            print(f"[PrerequisiteExpander] Auto-discovery failed: {e}")

    return result


def _run_expansion(target_technology_ids: List[str], mastered_skill_ids: List[str] = None) -> Dict[str, Any]:
    """Core BFS expansion logic over learning_nodes and learning_prerequisites."""
    mastered = set(mastered_skill_ids or [])
    
    # 1. Fetch all learning nodes and prerequisites to build a local map
    nodes_res = supabase.table("learning_nodes").select("id, technology_id, concept_name, difficulty_level").execute()
    prereqs_res = supabase.table("learning_prerequisites").select("node_id, prerequisite_node_id").execute()
    
    # tech_id -> node
    tech_to_node = {n["technology_id"]: n for n in nodes_res.data if n.get("technology_id")}
    node_by_id = {n["id"]: n for n in nodes_res.data}
    
    # node_id -> list of prereq_node_ids
    prereq_map = {}
    for p in prereqs_res.data:
        prereq_map.setdefault(p["node_id"], []).append(p["prerequisite_node_id"])
        
    resolved_node_ids = set()
    edges = set()
    
    # Queue for BFS/DFS traversal
    queue = []
    for tech_id in target_technology_ids:
        if tech_id in tech_to_node and tech_id not in mastered:
            queue.append(tech_to_node[tech_id]["id"])
            
    while queue:
        curr_node_id = queue.pop(0)
        if curr_node_id in resolved_node_ids:
            continue
        resolved_node_ids.add(curr_node_id)
        
        prereqs = prereq_map.get(curr_node_id, [])
        for p_id in prereqs:
            # Check if this prerequisite is linked to a technology the user has already mastered
            p_node = node_by_id.get(p_id)
            if p_node and p_node.get("technology_id") in mastered:
                continue
                
            edges.add((p_id, curr_node_id))
            queue.append(p_id)
            
    # Compile results
    result_nodes = {nid: node_by_id[nid] for nid in resolved_node_ids}
    return {
        "nodes": result_nodes,
        "edges": list(edges)
    }
