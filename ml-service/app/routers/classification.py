import logging
import time
from fastapi import APIRouter, HTTPException
from app.schemas.classification import ClassificationRequest, ClassificationResponse
from app.services.classification_service import run_classification

router = APIRouter()
logger = logging.getLogger("jaldrishti")

@router.post("/ml/classify", response_model=ClassificationResponse)
def classify_endpoint(request: ClassificationRequest):
    logger.info("POST /api/v1/ml/classify endpoint called")
    start_time = time.time()
    try:
        response = run_classification(request)
        execution_time = time.time() - start_time
        logger.info(f"GEC Classification completed in {execution_time:.3f} seconds")
        return response
    except Exception as e:
        logger.error(f"Error in classify endpoint: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=400,
            detail=f"Classification failed: {str(e)}"
        )
