from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator
from app.schemas.common import TimeseriesReading

class ForecastRequest(BaseModel):
    horizon_days: Optional[int] = Field(14, description="Forecast horizon in days")
    freq: Optional[str] = Field("D", description="Resampling/forecasting frequency")
    readings: List[TimeseriesReading] = Field(..., description="Array of historical readings for training the model")

    @field_validator("horizon_days")
    @classmethod
    def validate_horizon(cls, v):
        if v is not None and v < 1:
            raise ValueError("horizon_days must be at least 1.")
        return v

    @field_validator("readings")
    @classmethod
    def validate_readings(cls, v, info):
        # We need at least enough historical readings to support the split idx evaluation in Prophet:
        # split_idx = len(prophet_df) - horizon_days must be > 0.
        # Since we validate horizon_days, let's check length. We'll do a generic check here,
        # but the specific check happens when running the algorithm. Let's enforce a minimum of 5 readings.
        if len(v) < 5:
            raise ValueError("At least 5 readings are required to perform a forecast evaluation split.")
        return v

class ForecastRecord(BaseModel):
    timestamp: datetime
    predicted_level: float
    yhat_lower: float
    yhat_upper: float

class ForecastResponse(BaseModel):
    mae: float
    rmse: float
    forecast: List[ForecastRecord]
