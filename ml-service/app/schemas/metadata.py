from typing import List
from pydantic import BaseModel, Field

class MetadataResponse(BaseModel):
    version: str = Field(..., description="API Version")
    status: str = Field(..., description="Service status ('healthy' or 'unhealthy')")
    available_models: List[str] = Field(..., description="List of implemented ML capability endpoints")
