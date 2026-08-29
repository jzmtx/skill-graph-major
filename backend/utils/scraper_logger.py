import json
import os
from datetime import datetime

LOG_FILE = "scraper_logs.json"

def log_scraper_run(engine: str, search_term: str, status: str, items_scraped: int, error_message: str = ""):
    try:
        log_entry = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "engine": engine,
            "search_term": search_term,
            "status": status,
            "items_scraped": items_scraped,
            "error_message": error_message
        }
        
        logs = []
        if os.path.exists(LOG_FILE):
            try:
                with open(LOG_FILE, "r") as f:
                    content = f.read().strip()
                    if content:
                        logs = json.loads(content)
            except Exception as e:
                print(f"Failed to read scraper log file: {e}")
                logs = []
                
        # Insert at the beginning to keep it sorted (newest first)
        logs.insert(0, log_entry)
        
        # Keep only the last 200 logs
        logs = logs[:200]
        
        with open(LOG_FILE, "w") as f:
            json.dump(logs, f, indent=2)
    except Exception as e:
        print(f"Failed to write to scraper log: {e}")

def get_scraper_logs():
    if not os.path.exists(LOG_FILE):
        return []
    try:
        with open(LOG_FILE, "r") as f:
            content = f.read().strip()
            if content:
                return json.loads(content)
    except Exception as e:
        print(f"Failed to read scraper logs: {e}")
    return []
