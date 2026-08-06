from database import supabase
from typing import List, Dict, Any

def get_skill_details(skill_id: str) -> Dict[str, Any]:
    res = supabase.table("skill_knowledge_graph").select("*").eq("id", skill_id).execute()
    if not res.data:
        return {}
    return res.data[0]

def get_related_skills(parent_skill_id: str) -> List[Dict[str, Any]]:
    """
    Returns all child skills (frameworks, libraries) for a given ecosystem parent.
    """
    res = supabase.table("skill_knowledge_graph").select("*").eq("parent_skill_id", parent_skill_id).execute()
    return res.data

def get_resource_pack(skill_id: str) -> Dict[str, Any]:
    """
    Retrieves curated resources for a technology.
    """
    res = supabase.table("resource_packs").select("*").eq("skill_id", skill_id).execute()
    if res.data:
        return res.data[0]
    return {}

def resolve_skill_by_name(skill_name: str) -> Dict[str, Any]:
    res = supabase.table("skill_knowledge_graph").select("*").ilike("normalized_name", skill_name).execute()
    if res.data:
        return res.data[0]
    return {}
