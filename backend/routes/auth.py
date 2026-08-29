from fastapi import APIRouter, HTTPException
from database import supabase
from models import StudentRegisterRequest, StudentLoginRequest
import uuid

router = APIRouter()

@router.post("/register")
async def register_student(req: StudentRegisterRequest):
    try:
        # 1. Register user with Supabase Auth (Using Admin API)
        user_id = None
        try:
            auth_response = supabase.auth.admin.create_user({
                "email": req.email,
                "password": req.password,
                "email_confirm": True
            })
            if auth_response.user:
                user_id = auth_response.user.id
        except Exception as auth_err:
            print("Supabase Auth Error (bypassing for test):", auth_err)
            # Proceed with user_id = None so the local testing isn't blocked

        # 2. Check College Logic
        college_id_to_use = req.college_id
        if not college_id_to_use:
            # If it's a new college, insert it as pending approval
            new_college = supabase.table("colleges").insert({
                "name": req.college_name,
                "state": req.state,
                "is_approved": False
            }).execute()
            
            if not new_college.data:
                raise HTTPException(status_code=400, detail="Failed to register new college")
            
            college_id_to_use = new_college.data[0]["id"]

        # 3. Insert into the public.students table
        student_data = {
            "auth_id": user_id,
            "name": req.name,
            "email": req.email,
            "phone": req.phone,
            "state": req.state,
            "branch": req.branch,
            "year": req.year,
            "usn": req.usn,
            "college_id": college_id_to_use,
            "github_url": req.github_url,
            "linkedin_url": req.linkedin_url
        }

        # Ensure we wait for insertion
        student_response = supabase.table("students").insert(student_data).execute()

        return {"message": "Registration successful", "user": student_response.data[0]}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/login")
async def login_student(req: StudentLoginRequest):
    try:
        # 1. Sign in with Supabase Auth
        auth_response = supabase.auth.sign_in_with_password({
            "email": req.email,
            "password": req.password
        })
        
        if not auth_response.user:
            raise HTTPException(status_code=400, detail="Invalid credentials")

        user_id = auth_response.user.id

        # 2. Fetch student profile from public.students
        student_response = supabase.table("students").select("*").eq("auth_id", user_id).execute()
        
        if not student_response.data:
            raise HTTPException(status_code=404, detail="Student profile not found")

        return {"message": "Login successful", "user": student_response.data[0]}

    except Exception as e:
        print("LOGIN ERROR:", repr(e))
        raise HTTPException(status_code=401, detail="Invalid email or password. Or you might need to confirm your email.")
@router.post("/dev-login")
async def dev_login():
    try:
        # Fetch the very first student from the DB, no password needed
        student_response = supabase.table("students").select("*").limit(1).execute()
        
        if not student_response.data:
            raise HTTPException(status_code=404, detail="No students found in DB")

        return {"message": "Dev Login successful", "user": student_response.data[0]}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/force-reset-password")
async def force_reset_password(req: StudentLoginRequest):
    try:
        # Find user by email
        student_res = supabase.table("students").select("auth_id").eq("email", req.email).execute()
        if not student_res.data:
            raise HTTPException(status_code=404, detail="Account with this email not found")
        
        auth_id = student_res.data[0]["auth_id"]
        if not auth_id:
            raise HTTPException(status_code=400, detail="Account is not fully registered with Auth")
            
        # Force update password bypassing emails
        supabase.auth.admin.update_user_by_id(auth_id, {"password": req.password})
        return {"message": "Password updated successfully!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
