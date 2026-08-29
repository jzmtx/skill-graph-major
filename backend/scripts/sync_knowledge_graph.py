from services.knowledge_acquisition import get_pypi_dependencies, get_npm_dependencies, get_pypi_downloads, get_npm_downloads, get_github_stars, search_github_awesome_list
from services.industry_engine import update_industry_statistics
from database import supabase
import time

def sync_ecosystem(ecosystem_name: str, root_package_name: str, registry_type: str = "pypi"):
    """
    Simulates a cron job that refreshes ecosystem data automatically.
    """
    print(f"Syncing Ecosystem: {ecosystem_name}...")
    
    # 1. Update Industry Stats from Job Boards
    update_industry_statistics(ecosystem_name, force_refresh=True)
    
    # 2. Get dependencies from Registry to build relationships
    deps = []
    downloads = 0
    if registry_type == "pypi":
        deps = get_pypi_dependencies(root_package_name)
        downloads = get_pypi_downloads(root_package_name)
    elif registry_type == "npm":
        deps = get_npm_dependencies(root_package_name)
        downloads = get_npm_downloads(root_package_name)
        
    print(f"Registry data for {root_package_name}: {len(deps)} dependencies, {downloads} downloads/month.")
    
    # In a full run, we would map `deps` to skill_knowledge_graph and set `parent_skill_id`.
    
    # 3. Check Github momentum
    readme_text = search_github_awesome_list(ecosystem_name)
    if readme_text:
        print(f"Found 'Awesome {ecosystem_name}' list on GitHub! Length: {len(readme_text)} chars.")
        # Here we would send this to LLaMa-3 to extract new tools.
        
    print(f"Sync for {ecosystem_name} complete.\n")

if __name__ == "__main__":
    print("Starting Knowledge Graph Sync Worker...")
    
    # Example Sync for Python Backend Ecosystem
    sync_ecosystem("Backend Developer", "fastapi", registry_type="pypi")
    
    # Wait a bit to prevent rate limits
    time.sleep(2)
    
    # Example Sync for Frontend Ecosystem
    sync_ecosystem("Frontend Developer", "react", registry_type="npm")
