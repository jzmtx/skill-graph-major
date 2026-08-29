import networkx as nx
from typing import List, Dict, Any

from roadmap_engine.synthesis.prerequisite_expander import expand_prerequisites_recursive
from roadmap_engine.synthesis.alternative_resolver import resolve_alternatives
from roadmap_engine.synthesis.transitive_reducer import apply_transitive_reduction
from roadmap_engine.synthesis.topological_sort import sort_prerequisites

def generate_constraint_roadmap(
    career_name: str, 
    target_technology_ids: List[str], 
    mastered_skill_ids: List[str] = None,
    demand_scores: Dict[str, float] = None,
    confidence_score: float = 0.95
) -> Dict[str, Any]:
    """
    V1.1 Roadmap Synthesis Pipeline.
    Runs recursive expansion, resolves alternative nodes, reduces redundant edges,
    and returns a topologically sorted, market-ranked learning path.
    """
    scores = demand_scores or {}
    
    # 1. Expand prerequisites recursively (excluding mastered skills)
    # Passes career_name so auto-discovery triggers if nodes are empty
    expanded = expand_prerequisites_recursive(target_technology_ids, mastered_skill_ids, role_name=career_name)
    nodes = expanded["nodes"]
    edges = expanded["edges"]
    
    # 2. Build complete NetworkX DiGraph first to preserve all connectivity pathways
    G = nx.DiGraph()
    for nid, node_info in nodes.items():
        G.add_node(nid, name=node_info["concept_name"], category=node_info.get("difficulty_level", "Core"))
    G.add_edges_from(edges)
    
    # 3. Resolve alternatives and bypass the removed nodes
    node_ids = list(nodes.keys())
    resolved_node_ids = resolve_alternatives(node_ids, scores)
    resolved_set = set(resolved_node_ids)
    
    # Bypass and remove any nodes that were filtered out
    nodes_to_remove = [nid for nid in node_ids if nid not in resolved_set]
    for nid in nodes_to_remove:
        if G.has_node(nid):
            # Connect all predecessors of this node directly to all of its successors
            preds = list(G.predecessors(nid))
            succs = list(G.successors(nid))
            for p in preds:
                for s in succs:
                    G.add_edge(p, s)
            G.remove_node(nid)
    
    # 4. Apply Transitive Reduction
    reduced_G = apply_transitive_reduction(G)
    
    # 5. Perform Topological Sort
    sorted_path = sort_prerequisites(reduced_G)
    
    # 6. Rank nodes within difficulty phases using market demand scores
    final_nodes = []
    for idx, item in enumerate(sorted_path):
        # Retrieve the tech ID linked to this node
        tech_id = nodes[item["id"]].get("technology_id")
        score = scores.get(tech_id, 0.5) if tech_id else 0.5
        
        final_nodes.append({
            "skill": item["skill"],
            "type": item["category"],
            "priority": round(score, 2),
            "learning_order": idx + 1
        })
        
    return {
        "career": career_name,
        "market_version": "2026-08",
        "nodes": final_nodes,
        "alternatives": [],
        "confidence": confidence_score
    }
