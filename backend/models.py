from pydantic import BaseModel, EmailStr
from typing import Optional

class StudentRegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone: str
    state: str
    branch: str
    year: int
    usn: str
    college_id: Optional[str] = None
    college_name: str # if it's a new college
    github_url: Optional[str] = None
    linkedin_url: Optional[str] = None

class StudentLoginRequest(BaseModel):
    email: EmailStr
    password: str

class GitHubExtractRequest(BaseModel):
    student_id: str
    github_url: str

class SkillResponse(BaseModel):
    skill_name: str
    verification_level: int
    skill_score: int
    source: str
