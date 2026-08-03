from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator
from app.schemas.common import TimeseriesReading

class AnomalyRequest(BaseModel):
    freq: Optional[str] = Field("D", description="Resampling offset alias (e.g., 'D', 'H')")
    readings: List[TimeseriesReading] = Field(..., description="Array of timeseries water level measurements")

    @field_validator("readings")
    @classmethod
    def validate_readings(cls, v):
        if len(v) < 2:
            raise ValueError("At least 2 historical readings are required for anomaly detection.")
        return v

class AnomalyRecord(BaseModel):
    timestamp: datetime
    water_level: float
    is_anomaly_iforest: bool
    is_anomaly_stl: bool
    is_anomaly_zscore: bool
    is_anomaly: bool

class AnomalyResponse(BaseModel):
    anomalies: List[AnomalyRecord]
