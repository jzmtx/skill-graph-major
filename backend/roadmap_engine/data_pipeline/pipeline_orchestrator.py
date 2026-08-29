from typing import List, Dict
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..')))
from roadmap_engine.data_pipeline.extractors.mnc_llm_selector import MNCSelector
from roadmap_engine.data_pipeline.extractors.mnc_scraper import MNCScraper
from roadmap_engine.data_pipeline.extractors.adzuna_client import AdzunaClient
from roadmap_engine.data_pipeline.processing.skill_extractor import SkillExtractor
from roadmap_engine.data_pipeline.processing.normalizer import SkillNormalizer
from roadmap_engine.data_pipeline.processing.scoring_engine import IndustryScoringEngine
from roadmap_engine.data_pipeline.extractors.onet_client import ONETClient
from database import supabase

class PipelineOrchestrator:
    """
    The master controller for the Industry-Driven Data Pipeline.
    Ties together all extractors and processors.
    """
    
    def __init__(self):
        self.mnc_selector = MNCSelector()
        self.adzuna = AdzunaClient()
        self.extractor = SkillExtractor()
        self.normalizer = SkillNormalizer()
        self.scoring_engine = IndustryScoringEngine()
        self.onet = ONETClient()
        
    def run_pipeline(self, role_name: str, progress_callback=None):
        print(f"--- STARTING PIPELINE FOR: {role_name} ---")
        if progress_callback: progress_callback(10, "Selecting Top MNCs via LLM...")
        
        # 1. Get Top MNCs
        print("\n1. Selecting Top MNCs via LLM...")
        target_mncs, _, _ = self.mnc_selector.get_top_mncs(role_name)
        print(f"Targeting: {target_mncs}")
        
        # 2. Extract Platinum Jobs (MNCs)
        print("\n2. Scraping Platinum Jobs (JobSpy)...")
        if progress_callback: progress_callback(20, "Scraping Platinum Jobs via JobSpy...")
        scraper = MNCScraper(role_name, target_mncs)
        platinum_jobs, _, _ = scraper.fetch_jobs()
        print(f"Found {len(platinum_jobs)} Platinum Jobs.")
        
        # 3. Extract Market Jobs (Adzuna)
        print("\n3. Fetching Market Jobs (Adzuna) for ~900 jobs...")
        if progress_callback: progress_callback(40, "Fetching Market Jobs (Adzuna) for ~900 jobs...")
        market_jobs, status, quota = self.adzuna.fetch_jobs(role=role_name, target_count=900)
        print(f"Found {len(market_jobs)} Market Jobs.")
        
        # Combine Jobs
        all_jobs = platinum_jobs + market_jobs
        print(f"Total Jobs Collected: {len(all_jobs)}")
        if not all_jobs:
            print("ERROR: No jobs found. Aborting pipeline.")
            return
            
        # 4. Extract Raw Skills
        print("\n4. Extracting raw technical skills & Saving Raw JDs...")
        if progress_callback: progress_callback(60, "Extracting raw technical skills from Job Descriptions...")
        all_raw_skills = []
        
        # Prepare batch insert for raw jobs
        raw_jobs_payload = []
        
        for job in all_jobs:
            desc = str(job.get("description", ""))
            title = str(job.get("title", ""))
            if desc == "nan": desc = ""
            if title == "nan": title = ""
            job_text = desc + " " + title
            
            # Store in payload for Admin Panel transparency
            if job_text.strip():
                raw_jobs_payload.append({
                    "role_name": role_name,
                    "company_name": job.get("company", "Unknown"),
                    "job_title": title[:250],
                    "description": desc[:5000], # Cap length to avoid db bloat
                    "url": job.get("url", ""),
                    "source": "Aggregator"
                })
                
            skills = self.extractor.extract_skills(job_text)
            all_raw_skills.extend(skills)
            
        # Bulk insert raw jobs
        try:
            if raw_jobs_payload:
                # Insert in chunks of 100 to avoid request size limits
                for i in range(0, len(raw_jobs_payload), 100):
                    supabase.table("raw_job_postings").insert(raw_jobs_payload[i:i+100]).execute()
        except Exception as e:
            print(f"Error saving raw jobs to DB: {e}")
            
        print(f"Extracted {len(all_raw_skills)} total skill occurrences.")
        
        # 5. Normalize Skills via ESCO
        print("\n5. Normalizing skills against ESCO Taxonomy...")
        if progress_callback: progress_callback(80, "Normalizing skills against ESCO Taxonomy...")
        unique_skills = list(set(all_raw_skills))
        normalized = self.normalizer.normalize_skills(unique_skills)
        print(f"Normalized {len(normalized)} unique skills.")
        
        # 6. Calculating Industry Scores
        print("\n6. Calculating Industry Scores...")
        if progress_callback: progress_callback(90, "Calculating Industry Demand Scores (O*NET)...")
        total_jobs = len(all_jobs)
        skill_counts = {skill: all_raw_skills.count(skill) for skill in unique_skills}
        
        # (Mocking Ecosystem score until GitHub API is added)
        for norm_skill in normalized:
            raw_term = norm_skill["raw_term"]
            frequency = skill_counts[raw_term] / total_jobs
            
            # Use Official O*NET Database for Trend Score
            trend_score = self.onet.get_skill_trend(norm_skill['canonical_name'])
            
            final_score = self.scoring_engine.calculate_score(
                jd_frequency=frequency,
                trend_score=trend_score, 
                mnc_frequency=frequency, # Simplification for now
            )
            # 1. Upsert into canonical_skills
            canonical_skill_id = None
            try:
                # Check if it exists
                res = supabase.table("canonical_skills").select("id").eq("esco_uri", norm_skill["uri"]).execute()
                if res.data:
                    canonical_skill_id = res.data[0]["id"]
                else:
                    # Insert new canonical skill
                    insert_res = supabase.table("canonical_skills").insert({
                        "esco_uri": norm_skill["uri"] or f"custom-{raw_term}",
                        "title": norm_skill["canonical_name"]
                    }).execute()
                    canonical_skill_id = insert_res.data[0]["id"]
            except Exception as e:
                print(f"DB Error on Canonical Skill {norm_skill['canonical_name']}: {e}")
                continue
                
            # 2. Upsert into role_skill_demand
            if canonical_skill_id:
                try:
                    supabase.table("role_skill_demand").upsert({
                        "role_name": role_name,
                        "canonical_skill_id": canonical_skill_id,
                        "jd_frequency": float(frequency),
                        "onet_trend_score": float(trend_score),
                        "mnc_presence_score": float(frequency), # Simplified for now
                        "industry_score": float(final_score)
                    }, on_conflict="role_name,canonical_skill_id").execute()
                except Exception as e:
                    print(f"DB Error on Role Skill Demand {norm_skill['canonical_name']}: {e}")
            
        print("\n--- PIPELINE COMPLETE ---")

if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()
    
    orchestrator = PipelineOrchestrator()
    orchestrator.run_pipeline("Data Scientist")
    orchestrator.run_pipeline("Cybersecurity Analyst")
