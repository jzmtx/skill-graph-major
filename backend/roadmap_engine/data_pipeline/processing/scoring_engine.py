from typing import Dict, Any

class IndustryScoringEngine:
    """
    Calculates the final 'Industry Score' for a given skill based on:
    - Job Posting Frequency (Weight: 40%)
    - Trend / Importance from O*NET/Developer Surveys (Weight: 20%)
    - Top MNC Presence (Weight: 20%)
    - Skill Dependencies / Graph Centrality (Weight: 10%)
    - Ecosystem Signal (Weight: 10%)
    """
    
    def __init__(self):
        # Base Weights (Can be tweaked or driven by user configuration)
        self.W_FREQUENCY = 0.40
        self.W_TREND = 0.20
        self.W_MNC = 0.20
        self.W_DEPENDENCY = 0.10
        self.W_ECOSYSTEM = 0.10

    def calculate_score(self, 
                        jd_frequency: float, 
                        trend_score: float, 
                        mnc_frequency: float,
                        dependency_score: float = 0.5, # Default to mid if no graph data
                        ecosystem_score: float = 0.5   # Default to mid if no github data
                        ) -> float:
        """
        Takes normalized metrics (all values should be between 0.0 and 1.0) 
        and calculates the final weighted Industry Score.
        """
        
        score = (
            (jd_frequency * self.W_FREQUENCY) +
            (trend_score * self.W_TREND) +
            (mnc_frequency * self.W_MNC) +
            (dependency_score * self.W_DEPENDENCY) +
            (ecosystem_score * self.W_ECOSYSTEM)
        )
        
        return round(score, 3)

if __name__ == "__main__":
    engine = IndustryScoringEngine()
    
    # Example: Python for a Backend Developer
    python_score = engine.calculate_score(
        jd_frequency=0.92, # In 92% of general jobs
        trend_score=0.85,  # Very hot on O*NET/StackOverflow
        mnc_frequency=0.98, # Required by almost all FAANG
        dependency_score=0.90, # Prerequisite for Django, Flask, Data Science
        ecosystem_score=0.95 # Massive GitHub presence
    )
    
    print(f"Python Industry Score: {python_score}")
