from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field
from app.schemas.common import TimeseriesReading

class RechargeRequest(BaseModel):
    specific_yield: Optional[float] = Field(0.02, description="Specific yield coefficient of the aquifer")
    area_sqm: Optional[float] = Field(1000000.0, description="Aquifer area in square meters")
    official_annual_recharge_m3: Optional[float] = Field(None, description="Official annual recharge in cubic meters")
    readings: List[TimeseriesReading] = Field(..., description="Array of historical groundwater readings")

class RechargeYearRecord(BaseModel):
    year: int
    water_table_rise_m: float
    recharge_m3: float
    estimated_recharge_m3: Optional[float] = None
    source: str = Field(..., description="Source of the recharge value: 'official_gsda' or 'estimated'")

class RechargeResponse(BaseModel):
    yearly: List[RechargeYearRecord]