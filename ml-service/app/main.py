import logging
import time
from fastapi import FastAPI, Request, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Import stateless context to trigger global patch of loader.load_station
import app.utilities.stateless_context

# Import routers
from app.routers.health import router as health_router
from app.routers.metadata import router as metadata_router
from app.routers.anomaly import router as anomaly_router
from app.routers.gapfill import router as gapfill_router
from app.routers.forecast import router as forecast_router
from app.routers.recharge import router as recharge_router
from app.routers.classification import router as classification_router
from app.routers.extraction import router as extraction_router

# Configure logging
logger = logging.getLogger("jaldrishti")
logger.setLevel(logging.INFO)
if not logger.handlers:
    ch = logging.StreamHandler()
    ch.setLevel(logging.INFO)
    formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
    ch.setFormatter(formatter)
    logger.addHandler(ch)

app = FastAPI(
    title="JalDrishti ML Service",
    description="Stateless groundwater monitoring analysis APIs.",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Uptime/Timing middleware
@app.middleware("http")
async def log_request_timing(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time
    logger.info(f"Method: {request.method} Path: {request.url.path} Status: {response.status_code} Duration: {duration:.3f}s")
    return response

# Global validation error handler
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    logger.warning(f"Validation failure on {request.url.path}: {errors}")
    return JSONResponse(
        status_code=400,
        content={
            "success": False,
            "message": "Validation failed for request data.",
            "details": str(errors)
        }
    )

# Global HTTP exception handler
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": "Request failed.",
            "details": exc.detail
        }
    )

# Global fallback exception handler (no traceback to clients)
@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.url.path}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "Internal server error.",
            "details": "An unexpected error occurred while executing the calculation model."
        }
    )

# Mount health endpoint at root
app.include_router(health_router)

# Mount versioned endpoints under /api/v1
app.include_router(metadata_router, prefix="/api/v1")
app.include_router(anomaly_router, prefix="/api/v1")
app.include_router(gapfill_router, prefix="/api/v1")
app.include_router(forecast_router, prefix="/api/v1")
app.include_router(recharge_router, prefix="/api/v1")
app.include_router(classification_router, prefix="/api/v1")
app.include_router(extraction_router, prefix="/api/v1")
