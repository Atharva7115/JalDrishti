from fastapi import APIRouter
from app.schemas.metadata import MetadataResponse

router = APIRouter()

@router.get("/metadata", response_model=MetadataResponse)
def get_metadata_endpoint():
    return MetadataResponse(
        version="1.0.0",
        status="healthy",
        available_models=[
            "anomalies",
            "gap-fill",
            "forecast",
            "recharge",
            "classify"
        ]
    )
