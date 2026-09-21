from fastapi import APIRouter, HTTPException
from services.resource_engine import generate_resource_pack

router = APIRouter()

@router.get("/skills/{skill_id}/workspace")
async def get_workspace_resources(skill_id: str, role_name: str = "Software Engineering"):
    try:
        pack = generate_resource_pack(skill_id, role_name)
        if not pack:
            # We return generating status instead of 500 so frontend can poll
            return {"status": "generating"}
        return {"skill_id": skill_id, "resources": pack, "status": "completed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
