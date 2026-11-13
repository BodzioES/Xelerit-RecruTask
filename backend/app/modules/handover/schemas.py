from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class HandoverUpsert(BaseModel):
    """Create or update handover data for a Self Drive booking."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    generate_code: bool = False
    pickup_instructions: str | None = Field(default=None, max_length=2000)
    return_instructions: str | None = Field(default=None, max_length=2000)


class HandoverRead(BaseModel):
    booking_id: UUID
    access_code: str | None = None
    pickup_instructions: str | None
    return_instructions: str | None
    code_generated_at: datetime | None
    created_at: datetime
    updated_at: datetime
