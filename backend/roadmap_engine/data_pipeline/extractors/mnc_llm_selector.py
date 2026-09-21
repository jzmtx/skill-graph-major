import json
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..')))
from services.llm import client, GROQ_PRIMARY
from roadmap_engine.data_pipeline.extractors.api_tracker import track_api_usage

class MNCSelector:
    """
    Dynamically uses an LLM to identify the Top 10 MNCs hiring for a specific role.
    """
    
    @track_api_usage(provider="Groq", endpoint="/chat/completions")
    def get_top_mncs(self, role_name: str) -> tuple[list[str], int, int]:
        """
        Returns a tuple of (list_of_companies, status_code, quota_remaining).
        """
        prompt = f"""
        You are an expert tech recruiter. Return a raw JSON array containing exactly 
        10 specific, highly-relevant Multinational Corporations (MNCs) that are 
        currently hiring aggressively for the role: '{role_name}'.
        
        Rules:
        - Output ONLY a raw JSON array of strings. No markdown, no intro text.
        - Prioritize FAANG or equivalent massive tech employers.
        - Example: ["Google", "Microsoft", "Amazon", "Meta", "Netflix", "Uber", "Airbnb", "Stripe", "Apple", "IBM"]
        """
        
        try:
            response = client.chat.completions.create(
                model=GROQ_PRIMARY,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2
            )
            response_text = response.choices[0].message.content
            
            # Clean up potential markdown formatting from LLM
            clean_text = response_text.replace("```json", "").replace("```", "").strip()
            mnc_list = json.loads(clean_text)
            
            # Quota is placeholder 999 since Groq limits are high/rate-based
            return (mnc_list[:10], 200, 999) 
            
        except Exception as e:
            print(f"Error fetching MNCs via LLM: {e}")
            return (["Google", "Microsoft", "Amazon", "Meta", "Apple"], 500, 999) # Fallback

if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()
    
    selector = MNCSelector()
    mncs = selector.get_top_mncs("Cybersecurity Analyst")
    print(f"Dynamically Selected MNCs for Cybersecurity: {mncs}")
