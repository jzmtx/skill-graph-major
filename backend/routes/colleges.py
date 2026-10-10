from fastapi import APIRouter, HTTPException, Query
from database import supabase
from cachetools import TTLCache

router = APIRouter()

colleges_cache = TTLCache(maxsize=200, ttl=3600) # 1 hour TTL for colleges

@router.get("/search")
async def search_colleges(q: str = Query(..., min_length=2)):
    try:
        q_lower = q.lower()
        if q_lower in colleges_cache:
            return {"results": colleges_cache[q_lower]}
            
        # Perform an ilike (case-insensitive) search on the college name
        response = supabase.table("colleges").select("id, name, state, district").ilike("name", f"%{q}%").execute()
        
        colleges_cache[q_lower] = response.data
        return {"results": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
