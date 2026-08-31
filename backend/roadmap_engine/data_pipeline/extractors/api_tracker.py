import time
from typing import Callable, Any
import functools
import traceback
import sys
import os
import json
from datetime import datetime

# Ensure the backend root is in the path so we can import database
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..')))
from database import supabase

LOGS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..', 'logs'))
if not os.path.exists(LOGS_DIR):
    os.makedirs(LOGS_DIR)

ERROR_LOG_FILE = os.path.join(LOGS_DIR, 'pipeline_errors.json')

def log_error_locally(provider: str, endpoint: str, error_msg: str):
    error_entry = {
        "timestamp": datetime.now().isoformat(),
        "provider": provider,
        "endpoint": endpoint,
        "error": error_msg
    }
    try:
        errors = []
        if os.path.exists(ERROR_LOG_FILE):
            with open(ERROR_LOG_FILE, 'r') as f:
                try:
                    errors = json.load(f)
                except:
                    pass
        errors.insert(0, error_entry)
        with open(ERROR_LOG_FILE, 'w') as f:
            json.dump(errors[:100], f, indent=2) # Keep last 100 errors
    except Exception as e:
        print(f"Failed to write local error log: {e}")

def track_api_usage(provider: str, endpoint: str):
    """
    Decorator to wrap any external API call (LLM, Adzuna, ONET).
    Logs the success directly to the DB, and errors to a local JSON file.
    """
    def decorator(func: Callable):
        @functools.wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            try:
                result = func(*args, **kwargs)
                return result
            except Exception as e:
                error_message = str(e)
                traceback.print_exc()
                log_error_locally(provider, endpoint, error_message)
                raise e
            finally:
                # Log usage to Supabase (only existing columns)
                try:
                    log_entry = {
                        "provider": provider,
                        "endpoint": endpoint,
                        "tokens_used": 0,
                        "cost_usd": 0.0
                    }
                    supabase.table("api_usage_logs").insert(log_entry).execute()
                except Exception as log_error:
                    print(f"Failed to log API usage: {log_error}")
                    
        return wrapper
    return decorator
