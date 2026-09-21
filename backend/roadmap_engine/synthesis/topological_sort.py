import networkx as nx
from typing import List, Dict, Any

def sort_prerequisites(G: nx.DiGraph) -> List[Dict[str, Any]]:
    """
    Performs a topological sort on the prerequisite DAG and outputs a sequential list of skill nodes.
    """
    try:
        ordered_node_ids = list(nx.topological_sort(G))
    except nx.NetworkXUnfeasible:
        # Fallback if cycles remain: use simple greedy sorting based on in-degrees
        print("Cycle detected during topological sort. Falling back to degree-based ordering...")
        in_degrees = dict(G.in_degree())
        ordered_node_ids = sorted(in_degrees.keys(), key=lambda x: in_degrees[x])

    sorted_nodes = []
    for node_id in ordered_node_ids:
        node_data = G.nodes[node_id]
        sorted_nodes.append({
            "id": node_id,
            "skill": node_data.get("name", "Unknown Skill"),
            "category": node_data.get("category", "Concept"),
            "demand_score": node_data.get("demand_score", 0.0),
            "prerequisites": list(G.predecessors(node_id))
        })
    return sorted_nodes
