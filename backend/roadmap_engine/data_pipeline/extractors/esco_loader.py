import requests
from typing import List, Dict, Any, Optional
from .api_tracker import track_api_usage

class ESCOClient:
    """
    Client to interact with the European Commission's ESCO API.
    Used to pull canonical skill names and hierarchies for our ontology graph.
    API Docs: https://ec.europa.eu/esco/api/doc/esco_api_doc.html
    """
    
    BASE_URL = "https://ec.europa.eu/esco/api"
    
    def __init__(self, language: str = "en"):
        self.language = language

    @track_api_usage(provider="ESCO", endpoint="/search")
    def search_skills(self, text: str, limit: int = 10) -> tuple[List[Dict[str, Any]], int, int]:
        """
        Searches for skills matching the text string.
        Useful for normalizing messy JD text (e.g., 'K8s' -> 'Kubernetes')
        """
        endpoint = f"{self.BASE_URL}/search"
        params = {
            "text": text,
            "language": self.language,
            "type": "skill",
            "limit": limit
        }
        
        response = requests.get(endpoint, params=params)
        
        if response.status_code == 200:
            data = response.json()
            # Parse the ESCO JSON-LD format
            results = data.get("_embedded", {}).get("results", [])
            
            clean_skills = []
            for item in results:
                clean_skills.append({
                    "title": item.get("title"),
                    "uri": item.get("uri"),
                    "skillType": item.get("skillType") # 'skill/competence' or 'knowledge'
                })
            # ESCO is public, no quotas
            return (clean_skills, response.status_code, 999)
        else:
            response.raise_for_status()

    @track_api_usage(provider="ESCO", endpoint="/resource/skill")
    def get_skill_details(self, uri: str) -> tuple[Optional[Dict[str, Any]], int, int]:
        """
        Given an ESCO URI, fetches the exact details including relationships
        (broader/narrower skills).
        """
        endpoint = f"{self.BASE_URL}/resource/skill"
        params = {
            "uri": uri,
            "language": self.language
        }
        
        response = requests.get(endpoint, params=params)
        
        if response.status_code == 200:
            data = response.json()
            return (data, response.status_code, 999)
        else:
            response.raise_for_status()


if __name__ == "__main__":
    client = ESCOClient()
    
    # Test normalization
    messy_term = "Python"
    print(f"Normalizing term: {messy_term}...")
    skills, status, quota = client.search_skills(messy_term)
    
    if skills:
        print("Top match:")
        print(f"Title: {skills[0]['title']}")
        print(f"URI: {skills[0]['uri']}")
        print(f"Type: {skills[0]['skillType']}")
    else:
        print("No match found.")
