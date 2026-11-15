from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.db.enums import PropertyType

AssistedService = Literal["van_driver", "full_moving"]

MAX_DESCRIPTION_LENGTH = 2000


class MovePlanRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    description: str = Field(min_length=10, max_length=MAX_DESCRIPTION_LENGTH)
    service_type: AssistedService


class ModelItem(BaseModel):
    """One item as the model returns it; bounds are enforced, not trusted."""

    model_config = ConfigDict(extra="ignore")

    name: str = Field(min_length=1, max_length=60)
    quantity: int = Field(ge=1, le=99)


class ModelMovePlan(BaseModel):
    """The raw model answer. Anything outside these bounds is rejected as a bad response."""

    model_config = ConfigDict(extra="ignore")

    is_moving_request: bool
    suggested_service: AssistedService | None = None
    property_type: PropertyType | None = None
    floor: int | None = Field(default=None, ge=0, le=50)
    has_elevator: bool | None = None
    boxes_count: int | None = Field(default=None, ge=0, le=500)
    helpers: int | None = Field(default=None, ge=0, le=20)
    items: list[ModelItem] = Field(default_factory=list, max_length=30)
    summary: str = Field(default="", max_length=300)


class MovePlanItemRead(BaseModel):
    name: str
    quantity: int


class MovePlanRead(BaseModel):
    suggested_service: AssistedService | None
    property_type: PropertyType | None
    floor: int | None
    has_elevator: bool | None
    boxes_count: int | None
    helpers: int | None
    items: list[MovePlanItemRead]
    summary: str


class AssistantStatusRead(BaseModel):
    enabled: bool
