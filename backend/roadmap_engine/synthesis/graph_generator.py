import json
import sys
import os
from typing import List, Dict, Any

# Ensure we can import our services
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..')))
from services.llm import client, GROQ_PRIMARY
from database import supabase

class GraphGenerator:
    """
    Translates flat lists of market-demanded skills into a structured, pedagogical 
    roadmap graph (Main Path + Branches) tailored to the student's proficiency level.
    """
    
    def __init__(self):
        pass

    def fetch_top_skills(self, role_name: str, limit: int = 40) -> List[Dict[str, Any]]:
        """
        Fetches the highest-scoring canonical skills from the database for the given role.
        """
        try:
            # Using PostgREST resource embedding to join canonical_skills
            response = supabase.table("role_skill_demand") \
                .select("industry_score, canonical_skills(title)") \
                .eq("role_name", role_name) \
                .order("industry_score", desc=True) \
                .limit(limit) \
                .execute()
                
            skills = []
            for row in response.data:
                canonical = row.get("canonical_skills")
                if canonical and isinstance(canonical, dict):
                    title = canonical.get("title")
                    if title:
                        skills.append({
                            "skill": title,
                            "score": row.get("industry_score", 0)
                        })
            return skills
        except Exception as e:
            print(f"Error fetching skills for graph: {e}")
            return []

    def generate_roadmap(self, role_name: str, proficiency: str = "Beginner") -> Dict[str, Any]:
        """
        Generates the DAG roadmap via LLM using market skills.
        proficiency: "Beginner", "Intermediate", or "Advanced".
        """
        # 1. Fetch Market Data
        skills_data = self.fetch_top_skills(role_name, limit=40)
        
        if not skills_data:
            return {"error": f"No market data found for role: {role_name}. Please run the data pipeline first."}
            
        skills_list_str = ", ".join([f"{s['skill']} (Score: {s['score']})" for s in skills_data])
        
        # Determine target node counts based on proficiency
        if proficiency.lower() == "beginner":
            target_nodes = "25 to 35"
        elif proficiency.lower() == "intermediate":
            target_nodes = "15 to 20"
        else:
            target_nodes = "8 to 15"
            
        # 2. Prompt LLM Coordinator
        prompt = f"""
        You are an elite Staff Engineer and Career Mentor designing a learning roadmap for a {proficiency} {role_name}.
        
        We have extracted the top demanded skills for this role from real job postings:
        {skills_list_str}
        
        Your task is to organize these raw skills (and necessary fundamental concepts bridging them) into a structured learning path.
        
        ARCHITECTURE RULES:
        1. DO NOT create a massive spaghetti graph. Use a "Linear Main Path + Expandable Branches" model.
        2. Create EXACTLY 8 to 12 major sequential stages (e.g., "Fundamentals", "Web & APIs", "Database", "Cloud").
        3. Inside each stage, assign the specific skills/concepts as branches.
        4. Classify every branch node as one of the following:
           - "core" (Required)
           - "specialization" (Choose one path)
           - "optional" (Recommended but not strictly required)
           - "future" (Unlock later)
        5. Target roughly {target_nodes} total sub-nodes across the entire roadmap based on the student's '{proficiency}' level.
           If the student is Advanced, skip basic concepts. If Beginner, include basic concepts.
        6. A node doesn't have to be a technology; it can be a Concept, Skill, Tool, or Project (e.g. "REST API", "Query Optimization", "Capstone Project").
        
        Output strictly as a JSON object with this exact schema:
        {{
            "role": "{role_name}",
            "proficiency": "{proficiency}",
            "stages": [
                {{
                    "stage_id": 1,
                    "stage_name": "01 Fundamentals",
                    "nodes": [
                        {{
                            "node_id": "http_basics",
                            "name": "HTTP Fundamentals",
                            "type": "concept",
                            "classification": "core"
                        }}
                    ]
                }},
                {{
                    "stage_id": 2,
                    "stage_name": "02 Database",
                    "nodes": [
                        {{
                            "node_id": "sql",
                            "name": "SQL",
                            "type": "skill",
                            "classification": "core"
                        }},
                        {{
                            "node_id": "postgres",
                            "name": "PostgreSQL",
                            "type": "technology",
                            "classification": "specialization"
                        }}
                    ]
                }}
            ]
        }}
        
        Output ONLY the valid JSON object. No markdown, no conversational text.
        """
        
        try:
            response = client.chat.completions.create(
                model=GROQ_PRIMARY,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                response_format={"type": "json_object"}
            )
            raw_content = response.choices[0].message.content
            return json.loads(raw_content)
        except Exception as e:
            print(f"Error generating graph: {e}")
            return {"error": "Failed to generate roadmap graph"}

if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()
    
    generator = GraphGenerator()
    roadmap = generator.generate_roadmap("Data Scientist", "Beginner")
    print(json.dumps(roadmap, indent=2))
