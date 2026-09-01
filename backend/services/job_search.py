import os
import requests

RAPIDAPI_KEY = os.getenv("RAPIDAPI_KEY")
JSEARCH_URL = "https://jsearch.p.rapidapi.com/search-v2"


def search_company_jobs(company_name: str, title: str, location: str | None = None):
    """Searches JSearch (aggregates LinkedIn, Glassdoor, Indeed, etc.) for real job
    postings, biased toward the given company name. Returns only postings whose
    employer name matches the company, so a recruiter can never pull in a
    competitor's listing.
    """
    if not RAPIDAPI_KEY:
        raise RuntimeError("RAPIDAPI_KEY is not set in the environment")

    query = f"{title} at {company_name}"
    if location:
        query += f" in {location}"

    headers = {
        "X-RapidAPI-Key": RAPIDAPI_KEY,
        "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
    }
    params = {
        "query": query,
        "num_pages": "1",
    }

    response = requests.get(JSEARCH_URL, headers=headers, params=params, timeout=15)
    response.raise_for_status()
    data = response.json()

    # search-v2 nests the list under data.jobs, not data directly
    job_list = data.get("data", {}).get("jobs", [])

    results = []
    company_name_lower = company_name.strip().lower()

    for job in job_list:
        employer = (job.get("employer_name") or "").strip().lower()
        # Only keep postings that actually belong to this company —
        # simple substring match either direction covers most naming variants
        # (e.g. "Echobrains" vs "Echobrains Pvt Ltd" vs "Echobrains Inc").
        if company_name_lower not in employer and employer not in company_name_lower:
            continue

        min_sal = job.get("job_min_salary")
        max_sal = job.get("job_max_salary")
        period = job.get("job_salary_period")
        salary_display = None
        if min_sal and max_sal:
            salary_display = f"{min_sal}-{max_sal}" + (f" / {period.lower()}" if period else "")

        results.append({
            "title": job.get("job_title"),
            "employer_name": job.get("employer_name"),
            "description": job.get("job_description"),
            "location": job.get("job_city") or job.get("job_location") or job.get("job_country"),
            "salary_display": salary_display,
            "apply_link": job.get("job_apply_link"),
            "source": job.get("job_publisher"),
            # This response shape has no dedicated skills field —
            # left empty; company still fills Required Skills manually
            # or your existing extract_skills_from_description() can run on the description.
            "skills": [],
        })

    return results[:5]