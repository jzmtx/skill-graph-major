import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import supabase
from routes.opensource import _MEM_PROJECTS, _MEM_APPLICATIONS, _MEM_PROJECT_MESSAGES

router = APIRouter()

# Memory cache for direct messages between any two users strictly keyed by channel_id
_MEM_DIRECT_MESSAGES: List[Dict[str, Any]] = []

class SendMessagePayload(BaseModel):
    sender_id: str
    sender_name: str
    sender_type: str # 'student', 'alumni', 'company'
    message: str
    channel_type: Optional[str] = "direct"
    channel_id: Optional[str] = None
    recipient_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

def get_canonical_dm_key(id1: str, id2: str) -> str:
    """Returns a deterministic symmetric key for a 1-to-1 direct chat."""
    s1, s2 = sorted([str(id1), str(id2)])
    return f"dm_{s1}_{s2}"

@router.get("/contacts/{user_type}/{user_id}")
async def get_user_communications_contacts(user_type: str, user_id: str):
    """
    Mini-WhatsApp Unified Directory:
    1. GROUPS: Exactly named as Open Source project contributors ('<Project Title> Contributors')
       - One group per project team
       - Shared among all contributors and maintainers
    2. DIRECT (1:1): Exactly ONE contact per human person (Alumni, Teammates, Recruiters, Students)
       - Strictly deduplicated (same person never appears multiple times)
       - Isolated 1-to-1 message threads with zero cross-person message bleed
    """
    groups: List[Dict[str, Any]] = []
    direct_contacts: List[Dict[str, Any]] = []

    try:
        # ============================================================
        # 1. STUDENT VIEW
        # ============================================================
        if user_type == "student":
            student_id = user_id
            
            # Fetch student's college info
            student_college_id = None
            try:
                st_data = supabase.table("students").select("college_id").eq("id", student_id).execute()
                if st_data.data:
                    student_college_id = st_data.data[0].get("college_id")
            except Exception:
                pass

            # ------------------------------------------------------------
            # A. Open Source Groups (Exact Open Source Contributors)
            # ------------------------------------------------------------
            selected_projects = {}
            try:
                os_apps = supabase.table("open_source_applications").select(
                    "project_id, status, open_source_projects(id, title, max_contributors, alumni_id)"
                ).eq("student_id", student_id).execute()
                
                for a in (os_apps.data or []):
                    p = a.get("open_source_projects")
                    if p and a.get("status") in ["selected", "hired", "accepted", "approved", "contributing", "active"]:
                        selected_projects[p["id"]] = p
            except Exception as e:
                print("Error loading student os projects:", e)

            # Build Squad Groups & Collect Teammate Student IDs
            teammate_student_ids = set()
            for pid, p in selected_projects.items():
                p_title = p.get("title") or "Open Source"
                group_key = f"group_{pid}"
                
                # Fetch all contributors in this group
                members = []
                try:
                    contributors = supabase.table("open_source_applications").select(
                        "student_id, students(id, name, branch)"
                    ).eq("project_id", pid).in_("status", ["selected", "hired", "accepted", "contributing", "active"]).execute()
                    
                    for c in (contributors.data or []):
                        st = c.get("students") or {}
                        sid = c.get("student_id")
                        if sid:
                            if sid != student_id:
                                teammate_student_ids.add(sid)
                            members.append({
                                "id": sid,
                                "name": st.get("name") or "Contributor",
                                "branch": st.get("branch") or "Student",
                                "role": "Contributor",
                                "isMaintainer": False,
                                "isSelf": sid == student_id
                            })
                except Exception:
                    pass

                # Also fetch alumni maintainer
                al_id = p.get("alumni_id")
                if al_id:
                    try:
                        al_info = supabase.table("alumni").select("name, current_company").eq("id", al_id).execute()
                        if al_info.data:
                            al_data = al_info.data[0]
                            members.insert(0, {
                                "id": al_id,
                                "name": al_data.get("name") or "Maintainer",
                                "company": al_data.get("current_company") or "Alumni",
                                "role": "Maintainer",
                                "isMaintainer": True
                            })
                    except Exception:
                        pass

                # Fetch last group message
                last_msg = ""
                last_time = None
                try:
                    g_msgs = supabase.table("open_source_messages").select("message, created_at, sender_name").eq("project_id", pid).order("created_at", desc=True).limit(1).execute()
                    if g_msgs.data:
                        last_msg = f"{g_msgs.data[0].get('sender_name') or 'Team'}: {g_msgs.data[0].get('message', '')}"
                        last_time = g_msgs.data[0].get("created_at")
                except Exception:
                    pass

                groups.append({
                    "id": group_key,
                    "type": "group",
                    "title": f"{p_title} Contributors",
                    "recipientName": f"{p_title} Contributors",
                    "subtitle": f"Open Source Squad • {len(members)} Contributors",
                    "recipientRole": "Contributors Squad",
                    "contextTag": "OpenSource Squad",
                    "isGroup": True,
                    "memberCount": len(members),
                    "lastMessage": last_msg or f"Official team channel for {p_title} contributors",
                    "lastMessageTime": last_time,
                    "unreadCount": 0,
                    "metadata": {
                        "projectId": pid,
                        "members": members
                    }
                })

            # ------------------------------------------------------------
            # B. Direct Messages (1-to-1 Contacts: Deduplicated)
            # ------------------------------------------------------------
            seen_person_ids = set()

            # 1. Fetch Verified Alumni from same college
            try:
                al_query = supabase.table("alumni").select("id, name, current_company, current_job_role").eq("is_verified", True)
                if student_college_id:
                    al_query = al_query.eq("college_id", student_college_id)
                al_list = al_query.execute().data or []
                
                for al in al_list:
                    aid = al["id"]
                    if aid in seen_person_ids:
                        continue
                    seen_person_ids.add(aid)
                    
                    canonical_key = get_canonical_dm_key(student_id, aid)
                    
                    # Fetch last message between student and this alumni specifically
                    last_msg = ""
                    last_time = None
                    dm_msgs = [m for m in _MEM_DIRECT_MESSAGES if m.get("channel_id") == canonical_key]
                    if dm_msgs:
                        last_msg = dm_msgs[-1].get("message", "")
                        last_time = dm_msgs[-1].get("created_at")
                    else:
                        try:
                            al_opps = [o["id"] for o in supabase.table("opportunities").select("id").eq("alumni_id", aid).execute().data or []]
                            if al_opps:
                                al_db_msgs = supabase.table("alumni_messages").select("message, created_at").eq("student_id", student_id).in_("opportunity_id", al_opps).order("created_at", desc=True).limit(1).execute()
                                if al_db_msgs.data:
                                    last_msg = al_db_msgs.data[0].get("message", "")
                                    last_time = al_db_msgs.data[0].get("created_at")
                        except Exception:
                            pass

                    al_name = al.get("name") or "Alumni"
                    al_comp = al.get("current_company") or "Alumni Mentor"
                    al_role = al.get("current_job_role") or "Advisor"

                    direct_contacts.append({
                        "id": f"dm_{aid}",
                        "type": "direct",
                        "title": f"{al_comp} • {al_role}",
                        "recipientName": al_name,
                        "subtitle": f"{al_comp} • {al_role}",
                        "recipientRole": "Alumni Mentor",
                        "contextTag": "Alumni Direct",
                        "isGroup": False,
                        "lastMessage": last_msg or "Direct 1-to-1 chat with verified alumni",
                        "lastMessageTime": last_time,
                        "unreadCount": 0,
                        "metadata": {
                            "partnerId": aid,
                            "partnerName": al_name,
                            "partnerRole": "alumni",
                            "canonicalChannelId": canonical_key
                        }
                    })
            except Exception as e:
                print("Error loading alumni direct contacts:", e)

            # 2. Add Teammate Students (1-to-1 contacts with fellow contributors)
            if teammate_student_ids:
                try:
                    peers_res = supabase.table("students").select("id, name, branch").in_("id", list(teammate_student_ids)).execute()
                    for peer in (peers_res.data or []):
                        pid = peer["id"]
                        if pid in seen_person_ids or pid == student_id:
                            continue
                        seen_person_ids.add(pid)

                        canonical_key = get_canonical_dm_key(student_id, pid)
                        peer_name = peer.get("name") or "Teammate"
                        peer_branch = peer.get("branch") or "Student Contributor"

                        last_msg = ""
                        last_time = None
                        dm_msgs = [m for m in _MEM_DIRECT_MESSAGES if m.get("channel_id") == canonical_key]
                        if dm_msgs:
                            last_msg = dm_msgs[-1].get("message", "")
                            last_time = dm_msgs[-1].get("created_at")

                        direct_contacts.append({
                            "id": f"dm_{pid}",
                            "type": "direct",
                            "title": f"{peer_branch} • Contributor",
                            "recipientName": peer_name,
                            "subtitle": f"Squad Teammate • {peer_branch}",
                            "recipientRole": "Squad Teammate",
                            "contextTag": "Teammate Direct",
                            "isGroup": False,
                            "lastMessage": last_msg or "Direct 1-to-1 chat with squad teammate",
                            "lastMessageTime": last_time,
                            "unreadCount": 0,
                            "metadata": {
                                "partnerId": pid,
                                "partnerName": peer_name,
                                "partnerRole": "student",
                                "canonicalChannelId": canonical_key
                            }
                        })
                except Exception as e:
                    print("Error loading teammate contacts:", e)

        # ============================================================
        # 2. ALUMNI VIEW
        # ============================================================
        elif user_type == "alumni":
            # Resolve actual alumni_id from database if auth_id or alumni_id is passed
            al_record = None
            try:
                res1 = supabase.table("alumni").select("id, name, college_id").eq("id", user_id).execute()
                if res1.data:
                    al_record = res1.data[0]
                else:
                    res_auth = supabase.table("alumni").select("id, name, college_id").eq("auth_id", user_id).execute()
                    if res_auth.data:
                        al_record = res_auth.data[0]
            except Exception:
                pass

            alumni_id = al_record["id"] if al_record else user_id
            college_id = al_record.get("college_id") if al_record else None

            # A. Open Source Groups Managed by Alumni (Exact Open Source Contributors)
            try:
                al_projs = supabase.table("open_source_projects").select("id, title, created_at").eq("alumni_id", alumni_id).execute()
                for p in (al_projs.data or []):
                    pid = p["id"]
                    p_title = p["title"]
                    group_key = f"group_{pid}"

                    members = [
                        {
                            "id": alumni_id,
                            "name": "You (Maintainer)",
                            "role": "Maintainer",
                            "isMaintainer": True,
                            "isSelf": True
                        }
                    ]
                    try:
                        contributors = supabase.table("open_source_applications").select(
                            "student_id, students(id, name, branch)"
                        ).eq("project_id", pid).in_("status", ["selected", "hired", "accepted", "contributing", "active"]).execute()
                        for c in (contributors.data or []):
                            st = c.get("students") or {}
                            members.append({
                                "id": c.get("student_id"),
                                "name": st.get("name") or "Contributor",
                                "branch": st.get("branch") or "Student",
                                "role": "Contributor",
                                "isMaintainer": False
                            })
                    except Exception:
                        pass

                    last_msg = ""
                    last_time = p.get("created_at")
                    try:
                        g_msgs = supabase.table("open_source_messages").select("message, created_at, sender_name").eq("project_id", pid).order("created_at", desc=True).limit(1).execute()
                        if g_msgs.data:
                            last_msg = f"{g_msgs.data[0].get('sender_name') or 'Team'}: {g_msgs.data[0].get('message', '')}"
                            last_time = g_msgs.data[0].get("created_at")
                    except Exception:
                        pass

                    groups.append({
                        "id": group_key,
                        "type": "group",
                        "title": f"{p_title} Contributors",
                        "recipientName": f"{p_title} Contributors",
                        "subtitle": f"Open Source Squad • {len(members)} Contributors",
                        "recipientRole": "Contributors Squad",
                        "contextTag": "OpenSource Squad",
                        "isGroup": True,
                        "memberCount": len(members),
                        "lastMessage": last_msg or f"Active contributors group for {p_title}",
                        "lastMessageTime": last_time,
                        "unreadCount": 0,
                        "metadata": {
                            "projectId": pid,
                            "members": members
                        }
                    })
            except Exception as e:
                print("Error loading alumni project groups:", e)

            # B. Direct Messages (1-to-1 Contacts with each Student: Deduplicated)
            seen_student_ids = set()
            seen_student_names = set()
            try:
                cand_student_ids = []
                
                # 1. Project contributors
                try:
                    pids = [g["metadata"]["projectId"] for g in groups if g.get("metadata", {}).get("projectId")]
                    if pids:
                        proj_apps = supabase.table("open_source_applications").select("student_id").in_("project_id", pids).execute()
                        for pa in (proj_apps.data or []):
                            if pa.get("student_id"):
                                cand_student_ids.append(pa["student_id"])
                except Exception:
                    pass

                # 2. Opportunity applicants
                try:
                    al_opps = [o["id"] for o in supabase.table("opportunities").select("id").eq("alumni_id", alumni_id).execute().data or []]
                    if al_opps:
                        opp_interests = supabase.table("opportunity_interest").select("student_id").in_("opportunity_id", al_opps).execute()
                        for oi in (opp_interests.data or []):
                            if oi.get("student_id"):
                                cand_student_ids.append(oi["student_id"])
                except Exception:
                    pass

                # 3. Direct messages exchange
                for m in _MEM_DIRECT_MESSAGES:
                    if m.get("sender_id") == alumni_id and m.get("recipient_id"):
                        cand_student_ids.append(m["recipient_id"])
                    elif m.get("recipient_id") == alumni_id and m.get("sender_id"):
                        cand_student_ids.append(m["sender_id"])

                # 4. Students from same college (or fallback active students)
                try:
                    st_q = supabase.table("students").select("id")
                    if college_id:
                        st_q = st_q.eq("college_id", college_id)
                    col_students = st_q.limit(25).execute()
                    for cs in (col_students.data or []):
                        cand_student_ids.append(cs["id"])
                except Exception:
                    pass

                unique_cand_ids = list(set(cand_student_ids))
                if unique_cand_ids:
                    st_records = supabase.table("students").select("id, name, branch").in_("id", unique_cand_ids).execute().data or []
                    for st in st_records:
                        sid = st["id"]
                        st_name = (st.get("name") or "Student Candidate").strip()
                        clean_name = st_name.lower()
                        if sid in seen_student_ids or clean_name in seen_student_names:
                            continue
                        seen_student_ids.add(sid)
                        seen_student_names.add(clean_name)

                        canonical_key = get_canonical_dm_key(alumni_id, sid)
                        st_branch = st.get("branch") or "Student"

                        last_msg = ""
                        last_time = None
                        dm_msgs = [m for m in _MEM_DIRECT_MESSAGES if m.get("channel_id") == canonical_key]
                        if dm_msgs:
                            last_msg = dm_msgs[-1].get("message", "")
                            last_time = dm_msgs[-1].get("created_at")
                        else:
                            try:
                                al_opp_ids = [o["id"] for o in supabase.table("opportunities").select("id").eq("alumni_id", alumni_id).execute().data or []]
                                if al_opp_ids:
                                    last_db = supabase.table("alumni_messages").select("message, created_at").eq("student_id", sid).in_("opportunity_id", al_opp_ids).order("created_at", desc=True).limit(1).execute()
                                    if last_db.data:
                                        last_msg = last_db.data[0].get("message", "")
                                        last_time = last_db.data[0].get("created_at")
                            except Exception:
                                pass

                        direct_contacts.append({
                            "id": f"dm_{sid}",
                            "type": "direct",
                            "title": f"Student • {st_branch}",
                            "recipientName": st_name,
                            "subtitle": f"Candidate • {st_branch}",
                            "recipientRole": "Student Candidate",
                            "contextTag": "Student Direct",
                            "isGroup": False,
                            "lastMessage": last_msg or "Direct 1-to-1 chat with student candidate",
                            "lastMessageTime": last_time,
                            "unreadCount": 0,
                            "metadata": {
                                "partnerId": sid,
                                "partnerName": st_name,
                                "partnerRole": "student",
                                "canonicalChannelId": canonical_key
                            }
                        })
            except Exception as e:
                print("Error loading alumni direct contacts:", e)

        # Merge groups and direct contacts into a clean WhatsApp structure
        all_contacts = groups + direct_contacts
        return {"contacts": all_contacts}

    except Exception as e:
        print("Error generating communications contacts:", e)
        return {"contacts": []}


# ============================================================
# Messages Pipeline: 100% Isolated 1-to-1 & Group Dispatch
# ============================================================

@router.get("/messages/{channel_type}/{channel_id}")
async def get_communications_messages(channel_type: str, channel_id: str):
    """
    Message Fetcher with Absolute Thread Isolation:
    - Group messages are strictly partitioned by project_id
    - Direct messages are strictly partitioned by canonical_key (dm_minId_maxId)
    """
    messages = []
    try:
        # A. Group Chat (Exact Open Source Contributors)
        if channel_type == "group" or channel_id.startswith("group_"):
            project_id = channel_id.replace("group_", "")
            try:
                res = supabase.table("open_source_messages").select("*").eq("project_id", project_id).order("created_at", desc=False).execute()
                if res.data:
                    messages = res.data
            except Exception:
                pass
            if not messages:
                messages = [m for m in _MEM_PROJECT_MESSAGES if m.get("project_id") == project_id]

        # B. Direct 1-to-1 Chat (Strictly Isolated by canonical_channel_id)
        else:
            dm_key = channel_id
            
            # 1. Fetch from in-memory cache strictly for this exact channel_id
            mem_msgs = [m for m in _MEM_DIRECT_MESSAGES if m.get("channel_id") == dm_key]
            
            # 2. Fetch from DB if canonical key dm_id1_id2
            db_msgs = []
            if dm_key.startswith("dm_"):
                parts = dm_key[3:].split("_")
                if len(parts) == 2:
                    id1, id2 = parts[0], parts[1]
                    try:
                        # Check which one is alumni
                        al_res = supabase.table("alumni").select("id").in_("id", [id1, id2]).execute()
                        if al_res.data:
                            al_id = al_res.data[0]["id"]
                            st_id = id2 if id1 == al_id else id1
                            
                            # Find opportunities specifically posted by this alumni
                            opp_rows = supabase.table("opportunities").select("id").eq("alumni_id", al_id).execute().data or []
                            al_opp_ids = [o["id"] for o in opp_rows]
                            
                            # Strict query: only messages tied to this alumni's opportunities or directly sent by this alumni
                            if al_opp_ids:
                                res = supabase.table("alumni_messages").select("*").eq("student_id", st_id).in_("opportunity_id", al_opp_ids).order("created_at", desc=False).execute()
                                if res.data:
                                    db_msgs = res.data
                            else:
                                res = supabase.table("alumni_messages").select("*").eq("student_id", st_id).eq("sender_id", al_id).order("created_at", desc=False).execute()
                                if res.data:
                                    db_msgs = res.data
                    except Exception as e:
                        print("DB direct messages fetch error:", e)

            # Combine and deduplicate by message id
            combined = {m["id"]: m for m in (db_msgs + mem_msgs)}
            messages = sorted(list(combined.values()), key=lambda x: x.get("created_at", ""))

        return {"messages": messages}
    except Exception as e:
        print("Error fetching messages:", e)
        return {"messages": []}


@router.post("/messages/{channel_type}/{channel_id}")
async def send_communications_message(channel_type: str, channel_id: str, payload: SendMessagePayload):
    """
    Message Dispatcher with Absolute Thread Isolation (0ms UI latency):
    - Groups -> open_source_messages
    - Direct (1:1) -> canonical dm thread (strictly keyed by dm_minId_maxId)
    """
    now = datetime.utcnow().isoformat()
    record = {
        "id": str(uuid.uuid4()),
        "sender_id": payload.sender_id,
        "sender_name": payload.sender_name,
        "sender_type": payload.sender_type,
        "message": payload.message,
        "created_at": now
    }

    try:
        # A. Group Chat (Exact Open Source Contributors)
        if channel_type == "group" or channel_id.startswith("group_"):
            project_id = channel_id.replace("group_", "")
            record["project_id"] = project_id
            try:
                res = supabase.table("open_source_messages").insert(record).execute()
                if res.data:
                    return {"message": res.data[0]}
            except Exception:
                pass
            _MEM_PROJECT_MESSAGES.append(record)

        # B. Direct 1-to-1 Chat
        else:
            canonical_key = payload.metadata.get("canonicalChannelId") if payload.metadata else channel_id
            if not canonical_key or not canonical_key.startswith("dm_"):
                partner_id = payload.recipient_id or (payload.metadata.get("partnerId") if payload.metadata else None)
                if partner_id:
                    canonical_key = get_canonical_dm_key(payload.sender_id, partner_id)
                else:
                    canonical_key = channel_id

            record["channel_id"] = canonical_key
            record["recipient_id"] = payload.recipient_id or (payload.metadata.get("partnerId") if payload.metadata else None)
            _MEM_DIRECT_MESSAGES.append(record)

            # Also persist to alumni_messages table if between student and alumni
            try:
                p_id = payload.recipient_id or (payload.metadata.get("partnerId") if payload.metadata else None)
                if p_id:
                    al_id = None
                    st_id = None
                    if payload.sender_type == "alumni":
                        al_id = payload.sender_id
                        st_id = p_id
                    elif payload.sender_type == "student":
                        st_id = payload.sender_id
                        al_id = p_id

                    if al_id and st_id:
                        opp_rows = supabase.table("opportunities").select("id").eq("alumni_id", al_id).limit(1).execute().data or []
                        opp_id = opp_rows[0]["id"] if opp_rows else None
                        db_record = {
                            "id": record["id"],
                            "opportunity_id": opp_id,
                            "student_id": st_id,
                            "sender_type": payload.sender_type,
                            "sender_id": payload.sender_id,
                            "sender_name": payload.sender_name,
                            "message": payload.message,
                            "created_at": now
                        }
                        supabase.table("alumni_messages").insert(db_record).execute()
            except Exception as e:
                print("Direct message persist error:", e)

        return {"message": record}
    except Exception as e:
        print("Error sending message:", e)
        return {"message": record}
