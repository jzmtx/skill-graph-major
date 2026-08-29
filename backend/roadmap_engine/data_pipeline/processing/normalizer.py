from typing import List, Dict
from ..extractors.esco_loader import ESCOClient

class SkillNormalizer:
    """
    Takes raw, messy skills extracted from Job Descriptions and maps them
    to canonical ESCO URIs and standard names.
    """
    
    def __init__(self):
        self.esco = ESCOClient()
        self.cache = {} # Simple in-memory cache to avoid duplicate API calls for common terms

    def normalize_skills(self, raw_skills: List[str]) -> List[Dict[str, str]]:
        """
        Normalizes a list of raw skills.
        Returns a list of dicts: {"raw": "K8s", "canonical": "Kubernetes", "uri": "..."}
        """
        normalized = []
        
        for skill in set(raw_skills): # Use set to deduplicate raw skills first
            if skill in self.cache:
                normalized.append(self.cache[skill])
                continue
                
            print(f"Normalizing '{skill}' via ESCO...")
            try:
                esco_results, status, _ = self.esco.search_skills(skill, limit=1)
                
                if status == 200 and esco_results:
                    top_match = esco_results[0]
                    entry = {
                        "raw_term": skill,
                        "canonical_name": top_match["title"],
                        "uri": top_match["uri"]
                    }
                    self.cache[skill] = entry
                    normalized.append(entry)
                else:
                    # If ESCO fails to find it, fallback to the capitalized raw term
                    entry = {
                        "raw_term": skill,
                        "canonical_name": skill.title(),
                        "uri": None
                    }
                    self.cache[skill] = entry
                    normalized.append(entry)
            except Exception as e:
                print(f"Error normalizing {skill}: {e}")
                
        return normalized

if __name__ == "__main__":
    normalizer = SkillNormalizer()
    test_skills = ["reactjs", "python", "aws", "k8s"]
    results = normalizer.normalize_skills(test_skills)
    
    for r in results:
        print(f"{r['raw_term']} -> {r['canonical_name']} (URI: {r['uri']})")
