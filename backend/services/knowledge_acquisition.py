import requests
from typing import Dict, Any, List

# --- NPM API ---
def get_npm_downloads(package_name: str) -> int:
    try:
        url = f"https://api.npmjs.org/downloads/point/last-month/{package_name}"
        res = requests.get(url, timeout=5)
        if res.status_code == 200:
            return res.json().get("downloads", 0)
    except Exception:
        pass
    return 0

def get_npm_dependencies(package_name: str) -> List[str]:
    try:
        url = f"https://registry.npmjs.org/{package_name}/latest"
        res = requests.get(url, timeout=5)
        if res.status_code == 200:
            deps = res.json().get("dependencies", {})
            return list(deps.keys())
    except Exception:
        pass
    return []

# --- PyPI API ---
def get_pypi_dependencies(package_name: str) -> List[str]:
    try:
        url = f"https://pypi.org/pypi/{package_name}/json"
        res = requests.get(url, timeout=5)
        if res.status_code == 200:
            requires = res.json().get("info", {}).get("requires_dist", [])
            if not requires: return []
            
            # Requires dist looks like: ["pydantic (>=1.0)", "starlette", ...]
            clean_deps = []
            for r in requires:
                # Basic string manipulation to extract the package name
                name = r.split(" ")[0].split(";")[0].split(">")[0].split("<")[0].split("=")[0].split("~")[0]
                clean_deps.append(name.lower().strip())
            return clean_deps
    except Exception:
        pass
    return []

def get_pypi_downloads(package_name: str) -> int:
    try:
        # PyPI doesn't have a direct first-party endpoint for downloads without BigQuery, 
        # so we use pypistats.org
        url = f"https://pypistats.org/api/packages/{package_name}/recent"
        res = requests.get(url, timeout=5)
        if res.status_code == 200:
            return res.json().get("data", {}).get("last_month", 0)
    except Exception:
        pass
    return 0

# --- GitHub API ---
def search_github_awesome_list(ecosystem_name: str) -> str:
    """
    Searches for an 'awesome-<ecosystem>' repository and fetches its README content.
    Returns the markdown text to be parsed by the LLM later.
    """
    try:
        query = f"awesome-{ecosystem_name} in:name"
        url = f"https://api.github.com/search/repositories?q={query}&sort=stars&order=desc"
        res = requests.get(url, timeout=5)
        
        if res.status_code == 200:
            items = res.json().get("items", [])
            if items:
                top_repo = items[0]["full_name"]
                
                # Fetch README
                readme_url = f"https://raw.githubusercontent.com/{top_repo}/master/README.md"
                readme_res = requests.get(readme_url, timeout=5)
                
                if readme_res.status_code == 200:
                    return readme_res.text
    except Exception as e:
        print(f"Github search failed: {e}")
    return ""

def get_github_stars(repo_full_name: str) -> int:
    try:
        url = f"https://api.github.com/repos/{repo_full_name}"
        res = requests.get(url, timeout=5)
        if res.status_code == 200:
            return res.json().get("stargazers_count", 0)
    except Exception:
        pass
    return 0
