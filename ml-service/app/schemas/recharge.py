from typing import List, Optional
from pydantic import BaseModel, Field, field_validator
from app.schemas.common import TimeseriesReading

class RechargeRequest(BaseModel):
    specific_yield: Optional[float] = Field(0.02, description="Specific yield coefficient of the aquifer")
    area_sqm: Optional[float] = Field(1000000.0, description="Aquifer area in square meters")
    readings: List[TimeseriesReading] = Field(..., description="Array of historical readings for water level fluctuation analysis")

    @field_validator("specific_yield")
    @classmethod
    def validate_sy(cls, v):
        if v is not None and (v < 0.0 or v > 1.0):
            raise ValueError("specific_yield must be between 0.0 and 1.0.")
        return v

    @field_validator("area_sqm")
    @classmethod
    def validate_area(cls, v):
        if v is not None and v < 0.0:
            raise ValueError("area_sqm must be non-negative.")
        return v

class RechargeYearRecord(BaseModel):
    year: int
    water_table_rise_m: float
    recharge_m3: float

class RechargeResponse(BaseModel):
    yearly: List[RechargeYearRecord]
