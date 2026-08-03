from pydantic import BaseModel, Field

class ErrorResponse(BaseModel):
    success: bool = Field(False, description="Indicates whether the operation failed")
    message: str = Field(..., description="High-level error summary message")
    details: str = Field(..., description="Detailed description of the validation or system failure")
