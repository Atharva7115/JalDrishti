import logging
from fastapi import APIRouter, HTTPException

router = APIRouter()
logger = logging.getLogger("jaldrishti")

@router.post("/ml/extraction")
def extraction_endpoint():
    logger.warning("POST /api/v1/ml/extraction called (Not Implemented)")
    raise HTTPException(
        status_code=501,
        detail="Extraction estimation model is not implemented in the JalDrishti ML service."
    )
