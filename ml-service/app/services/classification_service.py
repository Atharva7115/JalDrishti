from app.schemas.classification import ClassificationRequest, ClassificationResponse
from classification.classification import classify_stage

def run_classification(request: ClassificationRequest) -> ClassificationResponse:
    # Calculate GEC Stage of Extraction %
    stage_pct = (request.annual_extraction_m3 / request.recharge_m3) * 100
    
    # Classify stage using GEC thresholds
    category = classify_stage(stage_pct)
    
    return ClassificationResponse(
        stage_of_extraction_pct=float(stage_pct),
        classification=category
    )
