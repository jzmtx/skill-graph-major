from fastapi import APIRouter, HTTPException
from services.resource_engine import generate_resource_pack

router = APIRouter()

@router.get("/workspace/{skill_name:path}")
async def get_workspace_resources(skill_name: str, role_name: str = "Software Engineering"):
    try:
        pack = generate_resource_pack(skill_name, role_name)
        if not pack:
            raise HTTPException(status_code=500, detail="Failed to generate resources")
        return {"skill_name": skill_name, "resources": pack}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
