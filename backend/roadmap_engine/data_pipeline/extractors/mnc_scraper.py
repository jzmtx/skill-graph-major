import pandas as pd
from typing import List, Dict, Any
from jobspy import scrape_jobs
from .api_tracker import track_api_usage

class MNCScraper:
    """
    Uses JobSpy to specifically target job postings from our dynamic list of MNCs.
    """
    
    def __init__(self, role_name: str, target_mncs: List[str]):
        self.role_name = role_name
        self.target_mncs = target_mncs
        self.results_per_company = 20 # To get ~100 jobs across 5 companies

    @track_api_usage(provider="JobSpy", endpoint="/scrape_jobs")
    def fetch_jobs(self) -> tuple[List[Dict[str, Any]], int, int]:
        """
        Executes the scraping logic across Indeed/LinkedIn/Glassdoor targeting specific MNCs.
        """
        all_formatted_jobs = []
        
        # We will iterate through the target MNCs and run a targeted search for each
        for company in self.target_mncs:
            search_term = f"{self.role_name} {company}"
            try:
                print(f"Scraping Platinum Jobs for: {search_term}")
                jobs_df: pd.DataFrame = scrape_jobs(
                    site_name=["indeed", "linkedin", "glassdoor"],
                    search_term=search_term,
                    results_wanted=self.results_per_company,
                    country_linkedin="worldwide",
                    country_indeed="USA",
                )
                
                if jobs_df is not None and not jobs_df.empty:
                    # JobSpy returns a DataFrame, convert to dicts
                    jobs_records = jobs_df.to_dict('records')
                    
                    for j in jobs_records:
                        # Ensure the job is actually from the target company (or close to it)
                        job_company = str(j.get("company", "")).lower()
                        if company.lower() in job_company:
                            all_formatted_jobs.append({
                                "title": j.get("title", ""),
                                "company": j.get("company", ""),
                                "description": j.get("description", ""),
                                "url": j.get("job_url", "")
                            })
            except Exception as e:
                print(f"Failed scraping for {company}: {e}")
                
        status = 200 if all_formatted_jobs else 404
        # Return format for api_tracker: (data, status, quota)
        return (all_formatted_jobs, status, 999)

if __name__ == "__main__":
    scraper = MNCScraper(role_name="Cybersecurity Analyst", target_mncs=["Google", "Microsoft"])
    jobs = scraper.fetch_jobs()
    print(f"Total Platinum Jobs Extracted: {len(jobs)}")

