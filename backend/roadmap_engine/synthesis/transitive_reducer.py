import networkx as nx

def apply_transitive_reduction(G: nx.DiGraph) -> nx.DiGraph:
    """
    Applies transitive reduction to the directed prerequisite DAG to prune redundant prerequisite edges.
    e.g., if A -> B -> C and A -> C exist, the direct edge A -> C is removed.
    Preserves all node attributes.
    """
    if not nx.is_directed_acyclic_graph(G):
        print("Warning: Prerequisite graph contains cycles. Resolving cycles before reduction...")
        # Break cycles if any exist to ensure a valid DAG
        cycles = list(nx.simple_cycles(G))
        for cycle in cycles:
            if len(cycle) >= 2:
                # Remove the backward edge of the cycle
                G.remove_edge(cycle[-1], cycle[0])
                
    TR = nx.transitive_reduction(G)
    # Transitive reduction returns a new graph without node/edge attributes.
    # We reconstruct the graph while preserving node attributes from G.
    reduced_G = nx.DiGraph()
    reduced_G.add_nodes_from(G.nodes(data=True))
    reduced_G.add_edges_from(TR.edges(data=True))
    return reduced_G
