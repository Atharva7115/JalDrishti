import logging
import time
from fastapi import APIRouter, HTTPException
from app.schemas.gapfill import GapFillRequest, GapFillResponse
from app.services.gapfill_service import run_gap_filling

router = APIRouter()
logger = logging.getLogger("jaldrishti")

@router.post("/ml/gap-fill", response_model=GapFillResponse)
def gap_fill_endpoint(request: GapFillRequest):
    logger.info("POST /api/v1/ml/gap-fill endpoint called")
    start_time = time.time()
    try:
        response = run_gap_filling(request)
        execution_time = time.time() - start_time
        logger.info(f"Gap filling completed in {execution_time:.3f} seconds")
        return response
    except Exception as e:
        logger.error(f"Error in gap fill endpoint: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=400,
            detail=f"Gap filling failed: {str(e)}"
        )
