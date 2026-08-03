from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field
from app.schemas.common import TimeseriesReading

class GapFillRequest(BaseModel):
    freq: Optional[str] = Field("D", description="Resampling offset alias (e.g., 'D', 'H')")
    readings: List[TimeseriesReading] = Field(..., description="Array of timeseries measurements (can contain missing/null water levels)")

class GapFillRecord(BaseModel):
    timestamp: datetime
    water_level: float
    was_filled: bool

class GapFillResponse(BaseModel):
    readings: List[GapFillRecord]
