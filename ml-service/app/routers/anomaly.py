import logging
import time
from fastapi import APIRouter, HTTPException
from app.schemas.anomaly import AnomalyRequest, AnomalyResponse
from app.services.anomaly_service import run_anomaly_detection

router = APIRouter()
logger = logging.getLogger("jaldrishti")

@router.post("/ml/anomalies", response_model=AnomalyResponse)
def detect_anomalies_endpoint(request: AnomalyRequest):
    logger.info("POST /api/v1/ml/anomalies endpoint called")
    start_time = time.time()
    try:
        response = run_anomaly_detection(request)
        execution_time = time.time() - start_time
        logger.info(f"Anomaly detection completed in {execution_time:.3f} seconds")
        return response
    except Exception as e:
        logger.error(f"Error in anomaly detection endpoint: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=400,
            detail=f"Anomaly detection failed: {str(e)}"
        )
