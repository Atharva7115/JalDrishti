import logging
import time
from fastapi import APIRouter, HTTPException
from app.schemas.recharge import RechargeRequest, RechargeResponse
from app.services.recharge_service import run_recharge_calculation

router = APIRouter()
logger = logging.getLogger("jaldrishti")

@router.post("/ml/recharge", response_model=RechargeResponse)
def recharge_endpoint(request: RechargeRequest):
    logger.info("POST /api/v1/ml/recharge endpoint called")
    start_time = time.time()
    try:
        response = run_recharge_calculation(request)
        execution_time = time.time() - start_time
        logger.info(f"Recharge calculation completed in {execution_time:.3f} seconds")
        return response
    except Exception as e:
        logger.error(f"Error in recharge endpoint: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=400,
            detail=f"Recharge calculation failed: {str(e)}"
        )
