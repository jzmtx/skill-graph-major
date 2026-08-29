from jobspy import scrape_jobs
from database import supabase
import re


def fetch_and_store_external_jobs(role: str, location: str = "India", results_wanted: int = 15):
    """
    Scrapes real job listings from LinkedIn/Indeed/Glassdoor via JobSpy for the given
    role + location, and inserts them into the jobs table as source='external'.
    """
    try:
        jobs_df = scrape_jobs(
            site_name=["indeed", "linkedin", "glassdoor"],
            search_term=role,
            location=location,
            results_wanted=results_wanted,
            country_indeed="India"
        )
    except Exception as e:
        return {"inserted": 0, "error": str(e)}

    if jobs_df is None or jobs_df.empty:
        return {"inserted": 0, "error": "No jobs found for this search"}

    inserted = 0
    skipped = 0

    for _, row in jobs_df.iterrows():
        job_url = row.get("job_url")
        title = row.get("title")
        company = row.get("company", "Unknown")

        if not job_url or str(job_url) == "nan" or not title or str(title) == "nan":
            continue

        existing = supabase.table("jobs").select("id").eq("external_url", str(job_url)).execute()
        if existing.data:
            skipped += 1
            continue

        description = row.get("description", "")
        if description and str(description) != "nan":
            description = re.sub(r'<[^>]+>', ' ', str(description))
            description = re.sub(r'\s+', ' ', description).strip()[:2000]
        else:
            description = None

        job_location = row.get("location")
        if job_location and str(job_location) != "nan":
            job_location = str(job_location)
        else:
            job_location = location

        supabase.table("jobs").insert({
            "recruiter_id": None,
            "title": str(title),
            "description": description,
            "required_skills": [],
            "location": job_location,
            "ctc": None,
            "deadline": None,
            "is_active": True,
            "source": "external",
            "external_url": str(job_url),
            "company_name": str(company) if str(company) != "nan" else "Unknown"
        }).execute()
        inserted += 1

    return {"inserted": inserted, "skipped": skipped, "total_found": len(jobs_df)}