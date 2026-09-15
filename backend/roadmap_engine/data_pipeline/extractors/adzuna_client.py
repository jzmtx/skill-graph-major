import os
import requests
from typing import List, Dict, Any, Tuple
from .api_tracker import track_api_usage

# Note: In production, load from os.getenv()
ADZUNA_APP_ID = os.getenv("ADZUNA_APP_ID")
ADZUNA_APP_KEY = os.getenv("ADZUNA_APP_KEY")
ADZUNA_BASE_URL = "http://api.adzuna.com/v1/api/jobs"

class AdzunaClient:
    """
    Client for fetching bulk job descriptions from Adzuna's free API tier.
    """
    
    def __init__(self, country: str = "in"):
        self.country = country
        
    @track_api_usage(provider="Adzuna", endpoint="/jobs")
    def fetch_jobs(self, role: str, target_count: int = 900) -> Tuple[List[Dict[str, Any]], int, int]:
        """
        Fetches jobs for a given role, paginating until target_count is reached.
        Returns a tuple of (job_list, status_code, quota_remaining_estimate).
        """
        if not ADZUNA_APP_ID or not ADZUNA_APP_KEY:
            raise ValueError("Adzuna credentials not found in environment.")
            
        formatted_jobs = []
        page = 1
        results_per_page = 50 # Adzuna's practical max
        status = 200
        quota = 250
        
        while len(formatted_jobs) < target_count:
            endpoint = f"{ADZUNA_BASE_URL}/{self.country}/search/{page}"
            params = {
                "app_id": ADZUNA_APP_ID,
                "app_key": ADZUNA_APP_KEY,
                "results_per_page": results_per_page,
                "what": role,
                "content-type": "application/json"
            }
            
            try:
                print(f"Fetching Adzuna Page {page} for {role}...")
                response = requests.get(endpoint, params=params)
                quota = int(response.headers.get("X-RateLimit-Remaining", 250)) 
                
                if response.status_code == 200:
                    data = response.json()
                    jobs = data.get("results", [])
                    if not jobs:
                        break # No more results available
                        
                    for j in jobs:
                        formatted_jobs.append({
                            "title": j.get("title", ""),
                            "company": j.get("company", {}).get("display_name", ""),
                            "location": j.get("location", {}).get("display_name", ""),
                            "description": j.get("description", ""),
                            "url": j.get("redirect_url", "")
                        })
                    page += 1
                else:
                    status = response.status_code
                    break
            except Exception as e:
                print(f"Adzuna pagination error: {e}")
                status = 500
                break
                
        # Trim to exact target count if we overshot
        formatted_jobs = formatted_jobs[:target_count]
        return (formatted_jobs, status, quota)

# Example usage (testing):
if __name__ == "__main__":
    # Ensure env vars are loaded if running this directly
    from dotenv import load_dotenv
    load_dotenv()
    
    client = AdzunaClient()
    try:
        # returns just the data array because the decorator unwraps the tuple
        jobs = client.fetch_jobs(role="Python Developer", results_per_page=5)
        print(f"Fetched {len(jobs)} jobs from Adzuna.")
        for j in jobs:
            print(f"- {j['title']} at {j['company']}")
    except Exception as e:
        print(f"Error fetching from Adzuna: {e}")
