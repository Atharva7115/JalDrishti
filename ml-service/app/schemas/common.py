from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class TimeseriesReading(BaseModel):
    timestamp: datetime = Field(..., description="Timestamp of the water level measurement in ISO format")
    water_level: Optional[float] = Field(None, description="Water level in meters (nullable for gap filling)")
