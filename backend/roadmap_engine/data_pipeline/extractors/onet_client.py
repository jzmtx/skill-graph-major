import pandas as pd
import requests
import io
import time
from typing import Dict, Any

class ONETClient:
    """
    Downloads and caches the official O*NET Technology Skills dataset.
    This completely bypasses the need for O*NET API Keys!
    """
    
    # We use db_28_2 or db_28_3 which are the recent O*NET data dumps
    ONET_URL = "https://www.onetcenter.org/dl_files/database/db_28_2_text/Technology%20Skills.txt"
    
    def __init__(self):
        self.df = None
        
    def load_data(self):
        """Fetches the official O*NET TSV file if not already loaded."""
        if self.df is not None:
            return
            
        print("Downloading O*NET Technology Skills Database (No API Key required)...")
        try:
            response = requests.get(self.ONET_URL)
            if response.status_code == 200:
                self.df = pd.read_csv(io.StringIO(response.text), sep='\t')
                print(f"Successfully loaded {len(self.df)} technology skills into memory.")
            else:
                print(f"Failed to download O*NET dataset. Status: {response.status_code}")
        except Exception as e:
            print(f"Error fetching O*NET data: {e}")

    def get_skill_trend(self, canonical_skill: str) -> float:
        """
        Determines the 'Trend Score' based on if the skill is listed in O*NET
        and specifically if it's flagged as a 'Hot Technology'.
        """
        self.load_data()
        if self.df is None or self.df.empty:
            return 0.5 # Default fallback
            
        # Search the 'Example' column for the canonical skill
        # e.g., if canonical_skill is "Python", check if it exists
        matches = self.df[self.df['Example'].str.contains(canonical_skill, case=False, na=False)]
        
        if matches.empty:
            return 0.1 # Very low trend, not officially recognized
            
        # If any match is marked as 'Y' in 'Hot Technology', it's a massive trend signal
        if 'Y' in matches['Hot Technology'].values:
            return 1.0 # Max score for Hot Technologies
            
        # Recognized but not "Hot"
        return 0.6

if __name__ == "__main__":
    client = ONETClient()
    score = client.get_skill_trend("Python")
    print(f"Python Trend Score: {score}")
    
    score_obscure = client.get_skill_trend("SomeRandomLib")
    print(f"Obscure Skill Trend Score: {score_obscure}")
