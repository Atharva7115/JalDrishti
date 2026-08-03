import time
from fastapi import APIRouter
from typing import Dict, Any

router = APIRouter()

# Record startup time for uptime calculation
START_TIME = time.time()

@router.get("/health")
def health_check() -> Dict[str, Any]:
    # Check dependencies status
    dependencies_ok = True
    try:
        import prophet
        import sklearn
        import statsmodels
    except ImportError:
        dependencies_ok = False

    uptime_seconds = time.time() - START_TIME

    return {
        "status": "healthy" if dependencies_ok else "degraded",
        "version": "1.0.0",
        "uptime_seconds": round(uptime_seconds, 2),
        "model_loading_status": "loaded" if dependencies_ok else "missing_dependencies",
        "available_endpoints": [
            "GET /health",
            "GET /api/v1/metadata",
            "POST /api/v1/ml/anomalies",
            "POST /api/v1/ml/gap-fill",
            "POST /api/v1/ml/forecast",
            "POST /api/v1/ml/recharge",
            "POST /api/v1/ml/classify",
            "POST /api/v1/ml/extraction"
        ]
    }
