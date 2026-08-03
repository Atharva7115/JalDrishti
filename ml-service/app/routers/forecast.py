import logging
import time
from fastapi import APIRouter, HTTPException
from app.schemas.forecast import ForecastRequest, ForecastResponse
from app.services.forecast_service import run_forecasting

router = APIRouter()
logger = logging.getLogger("jaldrishti")

@router.post("/ml/forecast", response_model=ForecastResponse)
def forecast_endpoint(request: ForecastRequest):
    logger.info("POST /api/v1/ml/forecast endpoint called")
    start_time = time.time()
    try:
        response = run_forecasting(request)
        execution_time = time.time() - start_time
        logger.info(f"Forecasting completed in {execution_time:.3f} seconds")
        return response
    except Exception as e:
        logger.error(f"Error in forecast endpoint: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=400,
            detail=f"Forecasting failed: {str(e)}"
        )
