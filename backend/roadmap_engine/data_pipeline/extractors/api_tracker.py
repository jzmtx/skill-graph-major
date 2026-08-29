import time
from typing import Callable, Any
import functools
import traceback
import sys
import os

# Ensure the backend root is in the path so we can import database
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..')))
from database import supabase

def track_api_usage(provider: str, endpoint: str):
    """
    Decorator to wrap any external API call (LLM, Adzuna, ONET).
    Logs the success, status code, quota, or errors directly to the DB.
    """
    def decorator(func: Callable):
        @functools.wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            status_code = None
            quota_remaining = None
            error_message = None
            start_time = time.time()
            
            try:
                # The decorated function must return a tuple:
                # (response_data, status_code, quota_remaining)
                result = func(*args, **kwargs)
                
                # Check if it returns the expected tuple format
                if isinstance(result, tuple) and len(result) >= 3:
                    data, status_code, quota_remaining = result[0], result[1], result[2]
                    return result
                
                return result # Fallback if not standard tuple
            
            except Exception as e:
                status_code = 500
                error_message = str(e)
                traceback.print_exc()
                raise e
                
            finally:
                # Log to Supabase
                try:
                    log_entry = {
                        "provider": provider,
                        "endpoint": endpoint,
                        "status_code": status_code,
                        "quota_remaining": quota_remaining,
                        "error_message": error_message
                    }
                    supabase.table("api_usage_logs").insert(log_entry).execute()
                except Exception as log_error:
                    print(f"Failed to log API usage: {log_error}")
                    
        return wrapper
    return decorator
