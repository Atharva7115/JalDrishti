from pydantic import BaseModel, Field, field_validator

class ClassificationRequest(BaseModel):
    recharge_m3: float = Field(..., description="Annual groundwater recharge volume in cubic meters")
    annual_extraction_m3: float = Field(..., description="Annual extraction volume in cubic meters")

    @field_validator("recharge_m3")
    @classmethod
    def validate_recharge(cls, v):
        if v <= 0:
            raise ValueError("recharge_m3 must be strictly greater than 0.")
        return v

    @field_validator("annual_extraction_m3")
    @classmethod
    def validate_extraction(cls, v):
        if v < 0:
            raise ValueError("annual_extraction_m3 must be non-negative.")
        return v

class ClassificationResponse(BaseModel):
    stage_of_extraction_pct: float = Field(..., description="Calculated stage of groundwater extraction in %")
    classification: str = Field(..., description="GEC category based on extraction ratio")
