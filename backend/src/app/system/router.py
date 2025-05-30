# app/system/router.py
from fastapi import APIRouter

router = APIRouter(tags=["system"], prefix="/system")


@router.get("/health")
async def get_health_status() -> dict:
    """Simple health check endpoint."""
    return {"status": "ok"}
