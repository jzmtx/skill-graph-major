from fastapi import APIRouter, HTTPException, Query
from database import supabase

router = APIRouter()

@router.get("/search")
async def search_colleges(q: str = Query(..., min_length=2)):
    try:
        # Perform an ilike (case-insensitive) search on the college name
        response = supabase.table("colleges").select("id, name, state, district").ilike("name", f"%{q}%").execute()
        return {"results": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
