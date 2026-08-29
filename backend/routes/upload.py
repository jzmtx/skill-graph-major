from fastapi import APIRouter, HTTPException, UploadFile, File
import cloudinary
import cloudinary.uploader
import os

router = APIRouter()

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True
)

ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx"}
MAX_FILE_SIZE_MB = 10


@router.post("/file")
async def upload_file(file: UploadFile = File(...)):
    """Uploads a file (proof document or resume) to Cloudinary and returns its URL.
    Used by TPO/Company/Alumni registration (proof_document_url) and
    student job applications (resume_url)."""
    try:
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"File type not allowed. Accepted: {', '.join(ALLOWED_EXTENSIONS)}"
            )

        contents = await file.read()
        size_mb = len(contents) / (1024 * 1024)
        if size_mb > MAX_FILE_SIZE_MB:
            raise HTTPException(status_code=400, detail=f"File too large. Max {MAX_FILE_SIZE_MB}MB.")

        result = cloudinary.uploader.upload(
            contents,
            resource_type="auto",
            folder="skillgraph_uploads"
        )

        return {"url": result.get("secure_url")}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))