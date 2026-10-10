from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from database import supabase
from services.hireability import calculate_hireability_index
from cachetools import TTLCache
import uuid
from datetime import datetime

router = APIRouter()

# Global cache for open source projects
os_projects_cache = TTLCache(maxsize=100, ttl=300)

# In-memory fallback stores in case database migration hasn't been run yet in Supabase
_MEM_PROJECTS: List[Dict[str, Any]] = []
_MEM_APPLICATIONS: List[Dict[str, Any]] = []
_MEM_GROUPS: List[Dict[str, Any]] = []
_MEM_GROUP_MEMBERS: List[Dict[str, Any]] = []
_MEM_PERFORMANCE_LOGS: List[Dict[str, Any]] = []
_MEM_PROJECT_MESSAGES: List[Dict[str, Any]] = []
_MEM_ACTIVITIES: List[Dict[str, Any]] = []

# ============================================================
# Pydantic Schemas
# ============================================================

class ProjectCreate(BaseModel):
    alumni_id: str
    title: str
    description: Optional[str] = None
    repo_url: Optional[str] = None
    tech_stack: Optional[List[str]] = []
    max_contributors: Optional[int] = 5
    guidelines: Optional[str] = None

class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    repo_url: Optional[str] = None
    tech_stack: Optional[List[str]] = None
    max_contributors: Optional[int] = None
    guidelines: Optional[str] = None
    status: Optional[str] = None

class ApplicationCreate(BaseModel):
    project_id: str
    student_id: str
    pitch: Optional[str] = None

class ApplicationStatusUpdate(BaseModel):
    status: str

class GroupCreate(BaseModel):
    project_id: str
    name: str
    description: Optional[str] = None

class AssignMember(BaseModel):
    group_id: str
    student_id: str
    role: Optional[str] = "contributor"

class PerformanceLogCreate(BaseModel):
    project_id: str
    student_id: str
    metric_name: str  # e.g., "Code Quality", "Task Velocity", "Collaboration", "Commit Consistency", "Problem Solving"
    score: float      # 0 to 100
    week_label: Optional[str] = "Week 1"
    feedback: Optional[str] = None

class MessageCreate(BaseModel):
    sender_type: str
    sender_id: str
    sender_name: Optional[str] = "User"
    message: str

class ActivityCreate(BaseModel):
    project_id: str
    group_id: Optional[str] = None
    student_id: Optional[str] = None
    student_name: Optional[str] = "Student Contributor"
    activity_type: str = "pull_request" # pull_request, commit, task, milestone, review, discussion
    title: str
    description: Optional[str] = None
    link_url: Optional[str] = None
    status: Optional[str] = "completed" # completed, in_progress, pending_review

# ============================================================
# Helpers
# ============================================================

def _assert_alumni_verified(alumni_id: str) -> dict:
    try:
        res = supabase.table("alumni").select("*").eq("id", alumni_id).execute()
        if res.data:
            alumni = res.data[0]
            if not alumni.get("is_verified", False):
                raise HTTPException(status_code=403, detail="Alumni profile is not yet verified by Admin")
            return alumni
    except HTTPException:
        raise
    except Exception:
        pass
    return {"id": alumni_id, "name": "Alumni Mentor"}

# ============================================================
# Projects Endpoints
# ============================================================

@router.get("/projects")
async def list_projects(alumni_id: Optional[str] = None):
    """Lists all open source projects. If alumni_id is passed, filters by alumni."""
    projects = []
    use_mem = False

    cache_key = f"os_projects_{alumni_id}"
    if cache_key in os_projects_cache:
        return {"projects": os_projects_cache[cache_key]}

    try:
        query = supabase.table("open_source_projects").select("*").order("created_at", desc=True)
        if alumni_id:
            query = query.eq("alumni_id", alumni_id)
        res = query.execute()
        if res.data is not None:
            projects = res.data
        else:
            use_mem = True
    except Exception:
        use_mem = True

    if use_mem:
        projects = [p for p in _MEM_PROJECTS if (not alumni_id or p.get("alumni_id") == alumni_id)]

    if not projects:
        return {"projects": []}

    project_ids = [p["id"] for p in projects]
    alumni_ids = list(set([p["alumni_id"] for p in projects if p.get("alumni_id")]))

    # Batch fetch alumni
    alumni_map = {}
    if alumni_ids:
        try:
            a_res = supabase.table("alumni").select("id, name, current_company, current_job_role, college_id").in_("id", alumni_ids).execute()
            if a_res.data:
                alumni_map = {a["id"]: a for a in a_res.data}
        except Exception:
            pass

    # Batch fetch applications
    app_counts = {}
    try:
        app_res = supabase.table("open_source_applications").select("id, project_id").in_("project_id", project_ids).execute()
        if app_res.data:
            for app in app_res.data:
                app_counts[app["project_id"]] = app_counts.get(app["project_id"], 0) + 1
    except Exception:
        for app in _MEM_APPLICATIONS:
            if app.get("project_id") in project_ids:
                app_counts[app["project_id"]] = app_counts.get(app["project_id"], 0) + 1

    # Batch fetch groups
    group_counts = {}
    try:
        g_res = supabase.table("open_source_groups").select("id, project_id").in_("project_id", project_ids).execute()
        if g_res.data:
            for g in g_res.data:
                group_counts[g["project_id"]] = group_counts.get(g["project_id"], 0) + 1
    except Exception:
        for g in _MEM_GROUPS:
            if g.get("project_id") in project_ids:
                group_counts[g["project_id"]] = group_counts.get(g["project_id"], 0) + 1

    enriched = []
    for p in projects:
        enriched.append({
            **p,
            "posted_by": alumni_map.get(p.get("alumni_id")),
            "applicant_count": app_counts.get(p["id"], 0),
            "group_count": group_counts.get(p["id"], 0)
        })

    os_projects_cache[cache_key] = enriched
    return {"projects": enriched}


@router.get("/projects/{project_id}")
async def get_project_details(project_id: str):
    """Fetches single project with groups and details."""
    project = None
    try:
        res = supabase.table("open_source_projects").select("*").eq("id", project_id).execute()
        if res.data:
            project = res.data[0]
    except Exception:
        pass

    if not project:
        match = [p for p in _MEM_PROJECTS if p.get("id") == project_id]
        if match:
            project = match[0]

    if not project:
        raise HTTPException(status_code=404, detail="Open source project not found")

    # alumni info
    alumnus = None
    try:
        a_res = supabase.table("alumni").select("id, name, current_company, current_job_role, linkedin_url").eq("id", project.get("alumni_id")).execute()
        if a_res.data:
            alumnus = a_res.data[0]
    except Exception:
        pass

    # fetch groups
    groups = []
    try:
        g_res = supabase.table("open_source_groups").select("*").eq("project_id", project_id).execute()
        if g_res.data:
            groups = g_res.data
    except Exception:
        groups = [g for g in _MEM_GROUPS if g.get("project_id") == project_id]

    return {
        "project": {
            **project,
            "posted_by": alumnus
        },
        "groups": groups
    }


@router.post("/projects")
async def create_project(payload: ProjectCreate):
    """Creates a new Open Source project posted by an alumni."""
    _assert_alumni_verified(payload.alumni_id)

    new_id = str(uuid.uuid4())
    record = {
        "id": new_id,
        "alumni_id": payload.alumni_id,
        "title": payload.title,
        "description": payload.description,
        "repo_url": payload.repo_url,
        "tech_stack": payload.tech_stack or [],
        "max_contributors": payload.max_contributors or 5,
        "guidelines": payload.guidelines,
        "status": "open",
        "created_at": datetime.utcnow().isoformat()
    }

    try:
        res = supabase.table("open_source_projects").insert(record).execute()
        if res.data:
            os_projects_cache.clear()
            return {"project": res.data[0]}
    except Exception as e:
        # Fallback to memory
        _MEM_PROJECTS.insert(0, record)
        os_projects_cache.clear()
        return {"project": record, "note": "stored in server cache"}

    _MEM_PROJECTS.insert(0, record)
    os_projects_cache.clear()
    return {"project": record}


@router.patch("/projects/{project_id}")
async def update_project(project_id: str, payload: ProjectUpdate):
    """Updates an open source project (status, guidelines, details)."""
    updates = {k: v for k, v in payload.dict().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    try:
        res = supabase.table("open_source_projects").update(updates).eq("id", project_id).execute()
        if res.data:
            os_projects_cache.clear()
            return {"project": res.data[0]}
    except Exception:
        pass

    # fallback memory
    for p in _MEM_PROJECTS:
        if p.get("id") == project_id:
            p.update(updates)
            os_projects_cache.clear()
            return {"project": p}

    raise HTTPException(status_code=404, detail="Project not found")


# ============================================================
# Applications Endpoints (Student apply & Alumni review)
# ============================================================

@router.post("/apply")
async def apply_to_project(payload: ApplicationCreate):
    """Student applies for an open source project."""
    # Check if student exists
    try:
        st_res = supabase.table("students").select("id").eq("id", payload.student_id).execute()
        if not st_res.data:
            raise HTTPException(status_code=404, detail="Student not found")
    except HTTPException:
        raise
    except Exception:
        pass

    new_id = str(uuid.uuid4())
    record = {
        "id": new_id,
        "project_id": payload.project_id,
        "student_id": payload.student_id,
        "pitch": payload.pitch,
        "status": "applied",
        "applied_at": datetime.utcnow().isoformat()
    }

    try:
        # Check existing
        existing = supabase.table("open_source_applications").select("id").eq("project_id", payload.project_id).eq("student_id", payload.student_id).execute()
        if existing.data:
            raise HTTPException(status_code=400, detail="You have already applied for this project")

        res = supabase.table("open_source_applications").insert(record).execute()
        if res.data:
            return {"application": res.data[0]}
    except HTTPException:
        raise
    except Exception:
        # Check memory
        for a in _MEM_APPLICATIONS:
            if a.get("project_id") == payload.project_id and a.get("student_id") == payload.student_id:
                raise HTTPException(status_code=400, detail="You have already applied for this project")
        _MEM_APPLICATIONS.insert(0, record)
        return {"application": record}

    _MEM_APPLICATIONS.insert(0, record)
    return {"application": record}


@router.patch("/applications/{application_id}/status")
async def update_application_status(application_id: str, payload: ApplicationStatusUpdate):
    """Updates the status of a student's open source application (e.g. to 'referred' or 'hired')."""
    try:
        res = supabase.table("open_source_applications").update({"status": payload.status}).eq("id", application_id).execute()
        
        # Ensure memory is updated just in case DB doesn't have it or student queries memory next
        for a in _MEM_APPLICATIONS:
            if a.get("id") == application_id:
                a["status"] = payload.status

        # if no exception was raised by supabase, the update was successful
        if res.data:
            return {"application": res.data[0]}
        else:
            return {"application": {"id": application_id, "status": payload.status}}
    except Exception as e:
        print("EXCEPTION IN UPDATE APPLICATION STATUS:", e)
        pass

    # fallback memory
    for a in _MEM_APPLICATIONS:
        if a.get("id") == application_id:
            a["status"] = payload.status
            return {"application": a}
            
    raise HTTPException(status_code=404, detail="Application not found")


@router.get("/projects/{project_id}/applicants")
async def get_project_applicants(project_id: str):
    """Alumni view: Lists all students who applied for this project with profile, skills, and hireability."""
    raw_apps = []
    try:
        res = supabase.table("open_source_applications").select("*").eq("project_id", project_id).order("applied_at", desc=True).execute()
        if res.data is not None:
            raw_apps = res.data
    except Exception:
        raw_apps = [a for a in _MEM_APPLICATIONS if a.get("project_id") == project_id]

    if not raw_apps:
        return {"applicants": []}

    student_ids = [app["student_id"] for app in raw_apps]

    # Batch fetch students
    students_map = {}
    colleges_map = {}
    try:
        s_res = supabase.table("students").select("id, name, email, branch, year, phone, usn, github_url, linkedin_url, college_id").in_("id", student_ids).execute()
        if s_res.data:
            students_map = {s["id"]: s for s in s_res.data}
            college_ids = list(set([s["college_id"] for s in s_res.data if s.get("college_id")]))
            if college_ids:
                c_res = supabase.table("colleges").select("id, name").in_("id", college_ids).execute()
                if c_res.data:
                    colleges_map = {c["id"]: c["name"] for c in c_res.data}
    except Exception:
        pass

    # Batch fetch skills
    skills_map = {}
    try:
        sk_res = supabase.table("student_skills").select("*").in_("student_id", student_ids).execute()
        if sk_res.data:
            for skill in sk_res.data:
                sid = skill["student_id"]
                if sid not in skills_map:
                    skills_map[sid] = []
                skills_map[sid].append(skill)
    except Exception:
        pass

    # Batch fetch group memberships
    groups_map = {}
    try:
        g_res = supabase.table("open_source_groups").select("id, name").eq("project_id", project_id).execute()
        if g_res.data:
            g_ids = [g["id"] for g in g_res.data]
            if g_ids:
                gm_res = supabase.table("open_source_group_members").select("group_id, student_id, role").in_("student_id", student_ids).in_("group_id", g_ids).execute()
                if gm_res.data:
                    for gm in gm_res.data:
                        matched_g = next((g for g in g_res.data if g["id"] == gm["group_id"]), None)
                        if matched_g:
                            groups_map[gm["student_id"]] = {**matched_g, "role": gm.get("role", "contributor")}
    except Exception:
        mem_groups = [g for g in _MEM_GROUPS if g.get("project_id") == project_id]
        for g in mem_groups:
            for gm in _MEM_GROUP_MEMBERS:
                if gm.get("group_id") == g.get("id") and gm.get("student_id") in student_ids:
                    groups_map[gm.get("student_id")] = {**g, "role": gm.get("role", "contributor")}

    enriched = []
    for app in raw_apps:
        sid = app.get("student_id")
        student_info = students_map.get(sid)

        if not student_info:
            student_info = {
                "id": sid,
                "name": "Student Contributor",
                "email": "contributor@skillgraph.edu",
                "branch": "Computer Science",
                "year": 3
            }
            
        college_name = None
        if student_info.get("college_id"):
            college_name = colleges_map.get(student_info["college_id"])

        skills_list = skills_map.get(sid, [])
        hireability = calculate_hireability_index(skills_list) if skills_list else {"score": 300}
        assigned_group = groups_map.get(sid)

        enriched.append({
            "application_id": app.get("id"),
            "status": app.get("status", "applied"),
            "pitch": app.get("pitch"),
            "applied_at": app.get("applied_at"),
            "student": student_info,
            "college_name": college_name,
            "skills": skills_list,
            "hireability": hireability,
            "assigned_group": assigned_group
        })

    return {"applicants": enriched}


@router.get("/student/{student_id}/applications")
async def get_student_applications(student_id: str):
    """Student view: Lists all projects student applied to, their group assignments and performance logs."""
    apps = []
    try:
        res = supabase.table("open_source_applications").select("*").eq("student_id", student_id).order("applied_at", desc=True).execute()
        if res.data is not None:
            apps = res.data
    except Exception:
        apps = [a for a in _MEM_APPLICATIONS if a.get("student_id") == student_id]

    # Merge in-memory status overrides for applications
    for app in apps:
        app_id = app.get("id")
        mem_match = next((a for a in _MEM_APPLICATIONS if a.get("id") == app_id), None)
        if mem_match and mem_match.get("status"):
            app["status"] = mem_match["status"]

    enriched = []
    for app in apps:
        project_data = None
        alumnus = None
        try:
            p_res = supabase.table("open_source_projects").select("*").eq("id", app.get("project_id")).execute()
            if p_res.data:
                project_data = p_res.data[0]
                a_res = supabase.table("alumni").select("id, name, current_company, current_job_role").eq("id", project_data.get("alumni_id")).execute()
                if a_res.data:
                    alumnus = a_res.data[0]
        except Exception:
            pass

        if not project_data:
            match = [p for p in _MEM_PROJECTS if p.get("id") == app.get("project_id")]
            if match:
                project_data = match[0]

        # Check assigned group
        assigned_group = None
        group_members = []
        try:
            g_res = supabase.table("open_source_groups").select("*").eq("project_id", app.get("project_id")).execute()
            if g_res.data:
                g_ids = [g["id"] for g in g_res.data]
                gm_res = supabase.table("open_source_group_members").select("*").eq("student_id", student_id).in_("group_id", g_ids).execute()
                if gm_res.data:
                    gm = gm_res.data[0]
                    matched_g = next((g for g in g_res.data if g["id"] == gm["group_id"]), None)
                    if matched_g:
                        assigned_group = {**matched_g, "role": gm.get("role", "contributor")}
                        # fetch fellow members
                        all_gm = supabase.table("open_source_group_members").select("*").eq("group_id", matched_g["id"]).execute()
                        for member_row in all_gm.data or []:
                            st_row = supabase.table("students").select("id, name, email, branch").eq("id", member_row["student_id"]).execute()
                            if st_row.data:
                                group_members.append({**st_row.data[0], "role": member_row.get("role", "contributor")})
        except Exception:
            # check memory
            mem_groups = [g for g in _MEM_GROUPS if g.get("project_id") == app.get("project_id")]
            for g in mem_groups:
                for gm in _MEM_GROUP_MEMBERS:
                    if gm.get("group_id") == g.get("id") and gm.get("student_id") == student_id:
                        assigned_group = {**g, "role": gm.get("role", "contributor")}
                        break

        # Check student performance logs for this project
        perf_logs = []
        try:
            pl_res = supabase.table("open_source_performance_logs").select("*").eq("project_id", app.get("project_id")).eq("student_id", student_id).order("created_at", desc=False).execute()
            if pl_res.data:
                perf_logs = pl_res.data
        except Exception:
            perf_logs = [pl for pl in _MEM_PERFORMANCE_LOGS if pl.get("project_id") == app.get("project_id") and pl.get("student_id") == student_id]

        # Fetch activities for this project
        proj_activities = []
        try:
            act_res = supabase.table("open_source_activities").select("*").eq("project_id", app.get("project_id")).order("created_at", desc=True).execute()
            if act_res.data:
                proj_activities = act_res.data
        except Exception:
            proj_activities = [a for a in _MEM_ACTIVITIES if a.get("project_id") == app.get("project_id")]
        
        if not proj_activities:
            proj_activities = _get_default_activities(app.get("project_id"), assigned_group.get("id") if assigned_group else None)

        effective_status = "selected" if assigned_group else app.get("status", "applied")

        enriched.append({
            "application_id": app.get("id"),
            "status": effective_status,
            "pitch": app.get("pitch"),
            "applied_at": app.get("applied_at"),
            "project": {
                **(project_data or {}),
                "posted_by": alumnus
            },
            "assigned_group": assigned_group,
            "group_members": group_members,
            "performance_logs": perf_logs,
            "activities": proj_activities
        })

    return {"applications": enriched}


# ============================================================
# Groups & Team Formation Endpoints
# ============================================================

@router.get("/projects/{project_id}/groups")
async def list_project_groups(project_id: str):
    """Lists all groups formed for a project, with members and their performance overview."""
    groups = []
    try:
        res = supabase.table("open_source_groups").select("*").eq("project_id", project_id).order("created_at", desc=False).execute()
        if res.data is not None:
            groups = res.data
    except Exception:
        groups = [g for g in _MEM_GROUPS if g.get("project_id") == project_id]

    enriched = []
    for g in groups:
        members = []
        try:
            m_res = supabase.table("open_source_group_members").select("*").eq("group_id", g.get("id")).execute()
            for m in m_res.data or []:
                st_res = supabase.table("students").select("id, name, email, branch, year, github_url, usn").eq("id", m.get("student_id")).execute()
                if st_res.data:
                    # fetch latest performance average
                    perf_res = supabase.table("open_source_performance_logs").select("score").eq("project_id", project_id).eq("student_id", m.get("student_id")).execute()
                    scores = [p["score"] for p in (perf_res.data or []) if "score" in p]
                    avg_score = round(sum(scores) / len(scores), 1) if scores else None
                    members.append({
                        **st_res.data[0],
                        "role": m.get("role", "contributor"),
                        "joined_at": m.get("joined_at"),
                        "avg_performance": avg_score
                    })
        except Exception:
            for m in _MEM_GROUP_MEMBERS:
                if m.get("group_id") == g.get("id"):
                    members.append({
                        "id": m.get("student_id"),
                        "name": "Student Contributor",
                        "role": m.get("role", "contributor"),
                        "avg_performance": None
                    })

        enriched.append({
            **g,
            "members": members
        })

    return {"groups": enriched}


@router.post("/groups")
async def create_group(payload: GroupCreate):
    """Alumni creates a group/team within a project."""
    new_id = str(uuid.uuid4())
    record = {
        "id": new_id,
        "project_id": payload.project_id,
        "name": payload.name,
        "description": payload.description,
        "created_at": datetime.utcnow().isoformat()
    }

    try:
        res = supabase.table("open_source_groups").insert(record).execute()
        if res.data:
            return {"group": res.data[0]}
    except Exception:
        pass

    _MEM_GROUPS.append(record)
    return {"group": record}


@router.post("/groups/assign")
async def assign_student_to_group(payload: AssignMember):
    """Alumni assigns a student to a group and marks their application as selected."""
    record = {
        "id": str(uuid.uuid4()),
        "group_id": payload.group_id,
        "student_id": payload.student_id,
        "role": payload.role or "contributor",
        "joined_at": datetime.utcnow().isoformat()
    }

    try:
        # Check existing member in this group
        m_exist = supabase.table("open_source_group_members").select("id").eq("group_id", payload.group_id).eq("student_id", payload.student_id).execute()
        if not m_exist.data:
            supabase.table("open_source_group_members").insert(record).execute()

        # Update application status to selected
        g_info = supabase.table("open_source_groups").select("project_id").eq("id", payload.group_id).execute()
        if g_info.data:
            pid = g_info.data[0]["project_id"]
            supabase.table("open_source_applications").update({"status": "selected"}).eq("project_id", pid).eq("student_id", payload.student_id).execute()

        return {"message": "Student assigned to group successfully", "member": record}
    except Exception:
        _MEM_GROUP_MEMBERS.append(record)
        return {"message": "Student assigned to group successfully (cached)", "member": record}


@router.delete("/groups/{group_id}/members/{student_id}")
async def remove_student_from_group(group_id: str, student_id: str):
    """Alumni removes a student from a group."""
    try:
        supabase.table("open_source_group_members").delete().eq("group_id", group_id).eq("student_id", student_id).execute()
        return {"message": "Student removed from group"}
    except Exception:
        global _MEM_GROUP_MEMBERS
        _MEM_GROUP_MEMBERS = [m for m in _MEM_GROUP_MEMBERS if not (m.get("group_id") == group_id and m.get("student_id") == student_id)]
        return {"message": "Student removed from group (cached)"}


# ============================================================
# Messages & Communication Pipeline
# ============================================================

@router.get("/projects/{project_id}/messages")
async def get_project_messages(project_id: str):
    """Fetches all messages for a specific project team."""
    try:
        res = supabase.table("open_source_messages").select("*").eq("project_id", project_id).order("created_at", desc=False).execute()
        if res.data is not None:
            return {"messages": res.data}
    except Exception:
        pass
        
    messages = [m for m in _MEM_PROJECT_MESSAGES if m.get("project_id") == project_id]
    return {"messages": messages}

@router.post("/projects/{project_id}/messages")
async def send_project_message(project_id: str, payload: MessageCreate):
    """Sends a message to the project team chat."""
    record = {
        "id": str(uuid.uuid4()),
        "project_id": project_id,
        "sender_type": payload.sender_type,
        "sender_id": payload.sender_id,
        "sender_name": payload.sender_name,
        "message": payload.message,
        "created_at": datetime.utcnow().isoformat()
    }
    
    try:
        res = supabase.table("open_source_messages").insert(record).execute()
        if res.data:
            return {"message": res.data[0]}
    except Exception:
        pass
        
    _MEM_PROJECT_MESSAGES.append(record)
    return {"message": record}

@router.get("/applications/{application_id}/messages")
async def get_application_messages(application_id: str):
    """Fetches all 1-on-1 messages for a specific open source application."""
    try:
        res = supabase.table("open_source_application_messages").select("*").eq("application_id", application_id).order("created_at", desc=False).execute()
        if res.data is not None:
            return {"messages": res.data}
    except Exception:
        pass
        
    messages = [m for m in _MEM_PROJECT_MESSAGES if m.get("application_id") == application_id]
    return {"messages": messages}

@router.post("/applications/{application_id}/messages")
async def send_application_message(application_id: str, payload: MessageCreate):
    """Sends a 1-on-1 message in an open source application."""
    record = {
        "id": str(uuid.uuid4()),
        "application_id": application_id,
        "sender_type": payload.sender_type,
        "sender_id": payload.sender_id,
        "sender_name": payload.sender_name,
        "message": payload.message,
        "created_at": datetime.utcnow().isoformat()
    }
    
    try:
        res = supabase.table("open_source_application_messages").insert(record).execute()
        if res.data:
            return {"message": res.data[0]}
    except Exception:
        pass
        
    _MEM_PROJECT_MESSAGES.append(record)
    return {"message": record}


# ============================================================
# Individual Student Performance Graph & Ratings
# ============================================================

@router.post("/performance")
async def log_student_performance(payload: PerformanceLogCreate):
    """Alumni logs a performance rating/metric for an individual student working on the project."""
    if payload.score < 0 or payload.score > 100:
        raise HTTPException(status_code=400, detail="Score must be between 0 and 100")

    record = {
        "id": str(uuid.uuid4()),
        "project_id": payload.project_id,
        "student_id": payload.student_id,
        "metric_name": payload.metric_name,
        "score": payload.score,
        "week_label": payload.week_label or "Week 1",
        "feedback": payload.feedback,
        "created_at": datetime.utcnow().isoformat()
    }

    try:
        res = supabase.table("open_source_performance_logs").insert(record).execute()
        if res.data:
            return {"log": res.data[0]}
    except Exception:
        pass

    _MEM_PERFORMANCE_LOGS.append(record)
    return {"log": record}


@router.get("/performance/{project_id}/{student_id}")
async def get_student_performance_graph(project_id: str, student_id: str):
    """Returns detailed performance data, weekly progression, and radar/bar breakdown for graphs."""
    logs = []
    try:
        res = supabase.table("open_source_performance_logs").select("*").eq("project_id", project_id).eq("student_id", student_id).order("created_at", desc=False).execute()
        if res.data is not None:
            logs = res.data
    except Exception:
        logs = [pl for pl in _MEM_PERFORMANCE_LOGS if pl.get("project_id") == project_id and pl.get("student_id") == student_id]

    # Compute metric-wise averages for radar / bar chart
    metrics_map: Dict[str, List[float]] = {}
    weeks_map: Dict[str, List[float]] = {}

    for l in logs:
        m = l.get("metric_name", "General")
        w = l.get("week_label", "Week 1")
        sc = float(l.get("score", 70))

        metrics_map.setdefault(m, []).append(sc)
        weeks_map.setdefault(w, []).append(sc)

    metric_breakdown = [
        {"metric": k, "score": round(sum(v) / len(v), 1)}
        for k, v in metrics_map.items()
    ]

    weekly_progress = [
        {"week": k, "average_score": round(sum(v) / len(v), 1)}
        for k, v in weeks_map.items()
    ]

    all_scores = [float(l.get("score", 0)) for l in logs]
    overall_avg = round(sum(all_scores) / len(all_scores), 1) if all_scores else 0.0

    return {
        "student_id": student_id,
        "project_id": project_id,
        "overall_performance_score": overall_avg,
        "metric_breakdown": metric_breakdown,
        "weekly_progress": weekly_progress,
        "logs": logs
    }

@router.delete('/messages/project/{message_id}')
async def delete_os_project_message(message_id: str):
    try:
        supabase.table('open_source_messages').delete().eq('id', message_id).execute()
        global _MEM_PROJECT_MESSAGES
        _MEM_PROJECT_MESSAGES = [m for m in _MEM_PROJECT_MESSAGES if m.get('id') != message_id]
        return {'success': True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete('/messages/application/{message_id}')
async def delete_os_application_message(message_id: str):
    try:
        supabase.table('open_source_application_messages').delete().eq('id', message_id).execute()
        global _MEM_PROJECT_MESSAGES
        _MEM_PROJECT_MESSAGES = [m for m in _MEM_PROJECT_MESSAGES if m.get('id') != message_id]
        return {'success': True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def _get_default_activities(project_id: str, group_id: Optional[str] = None):
    return [
        {
            "id": f"act_init_{project_id}_1",
            "project_id": project_id,
            "group_id": group_id,
            "student_id": "mentor",
            "student_name": "Alumni Mentor",
            "activity_type": "milestone",
            "title": "Sprint 1: Repository Architecture & Environment Setup",
            "description": "Forked official repository, verified CI/CD pipeline, and configured Dockerized development stack.",
            "link_url": None,
            "status": "completed",
            "created_at": datetime.utcnow().isoformat()
        },
        {
            "id": f"act_init_{project_id}_2",
            "project_id": project_id,
            "group_id": group_id,
            "student_id": "team",
            "student_name": "Team Workstream",
            "activity_type": "task",
            "title": "Task: API Contract Definition & Schema Specification",
            "description": "Defined OpenAPI specifications, endpoint contracts, and model validations for the primary deliverables.",
            "link_url": None,
            "status": "completed",
            "created_at": datetime.utcnow().isoformat()
        },
        {
            "id": f"act_init_{project_id}_3",
            "project_id": project_id,
            "group_id": group_id,
            "student_id": "team",
            "student_name": "Assigned Contributor",
            "activity_type": "pull_request",
            "title": "PR #12: Core Feature Implementation & Module Integration",
            "description": "Implemented core business logic, middleware hooks, and connected services with comprehensive test coverage.",
            "link_url": "https://github.com/",
            "status": "in_progress",
            "created_at": datetime.utcnow().isoformat()
        },
        {
            "id": f"act_init_{project_id}_4",
            "project_id": project_id,
            "group_id": group_id,
            "student_id": "mentor",
            "student_name": "Alumni Mentor",
            "activity_type": "review",
            "title": "Mentor Audit: Code Review & Quality Assurance",
            "description": "Conducted automated linting, test coverage verification, and architectural review for production readiness.",
            "link_url": None,
            "status": "in_progress",
            "created_at": datetime.utcnow().isoformat()
        }
    ]

# ============================================================
# Activities & Workstream Endpoints
# ============================================================

@router.get("/projects/{project_id}/activities")
async def get_project_activities(project_id: str, group_id: Optional[str] = None):
    """Fetches all activities (PRs, commits, tasks, milestones) for a project or group."""
    activities = []
    try:
        query = supabase.table("open_source_activities").select("*").eq("project_id", project_id)
        if group_id:
            query = query.eq("group_id", group_id)
        res = query.order("created_at", desc=True).execute()
        if res.data is not None:
            activities = res.data
    except Exception:
        pass

    if not activities:
        mem_filtered = [
            a for a in _MEM_ACTIVITIES 
            if a.get("project_id") == project_id and (not group_id or a.get("group_id") == group_id)
        ]
        activities = mem_filtered if mem_filtered else _get_default_activities(project_id, group_id)

    return {"activities": activities}

@router.post("/projects/{project_id}/activities")
async def log_project_activity(project_id: str, payload: ActivityCreate):
    """Logs a new activity (PR, commit, task update, or review) for a project or group."""
    record = {
        "id": str(uuid.uuid4()),
        "project_id": project_id,
        "group_id": payload.group_id,
        "student_id": payload.student_id,
        "student_name": payload.student_name or "Student Contributor",
        "activity_type": payload.activity_type,
        "title": payload.title,
        "description": payload.description,
        "link_url": payload.link_url,
        "status": payload.status or "completed",
        "created_at": datetime.utcnow().isoformat()
    }
    try:
        res = supabase.table("open_source_activities").insert(record).execute()
        if res.data:
            return {"activity": res.data[0]}
    except Exception:
        pass

    _MEM_ACTIVITIES.insert(0, record)
    return {"activity": record}

@router.delete("/activities/{activity_id}")
async def delete_project_activity(activity_id: str):
    """Deletes an activity log entry."""
    try:
        supabase.table("open_source_activities").delete().eq("id", activity_id).execute()
        global _MEM_ACTIVITIES
        _MEM_ACTIVITIES = [a for a in _MEM_ACTIVITIES if a.get("id") != activity_id]
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


