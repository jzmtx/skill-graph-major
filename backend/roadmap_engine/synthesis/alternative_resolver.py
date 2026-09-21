from typing import List, Dict, Any, Set
from database import supabase

def resolve_alternatives(node_ids: List[str], demand_scores: Dict[str, float]) -> List[str]:
    """
    Identifies alternative framework groups (e.g. Django vs FastAPI vs Flask)
    and retains only the single alternative node with the highest market demand score.
    Returns:
        The filtered list of resolved node_ids.
    """
    if not node_ids:
        return []
        
    # 1. Fetch alternative mappings
    alt_res = supabase.table("learning_alternatives").select("node_id, alternative_group_id").in_("node_id", node_ids).execute()
    if not alt_res.data:
        return node_ids
        
    # Fetch technology_id for the nodes to map to demand_scores keys
    nodes_res = supabase.table("learning_nodes").select("id, technology_id").in_("id", node_ids).execute()
    node_to_tech = {n["id"]: n["technology_id"] for n in nodes_res.data}

    # Group node IDs by alternative group
    group_map = {} # group_id -> list of node_ids
    node_to_group = {}
    for row in alt_res.data:
        group_id = row["alternative_group_id"]
        nid = row["node_id"]
        group_map.setdefault(group_id, []).append(nid)
        node_to_group[nid] = group_id
        
    resolved_nodes = set(node_ids)
    
    # For each group, pick the highest scoring node and remove the others
    for group_id, nids in group_map.items():
        if len(nids) <= 1:
            continue
            
        # Get tech score for each node using the technology_id mapping
        best_nid = max(nids, key=lambda x: demand_scores.get(node_to_tech.get(x), 0.0))
        for nid in nids:
            if nid != best_nid:
                resolved_nodes.discard(nid)
                
    return list(resolved_nodes)
