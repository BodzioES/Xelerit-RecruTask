from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.db.enums import EmployeeRole

REQUIRED_UPDATE_FIELDS = frozenset({"first_name", "last_name", "role", "is_active"})


class EmployeeBase(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    role: EmployeeRole


class EmployeeCreate(EmployeeBase):
    is_active: bool = True


class EmployeeUpdate(BaseModel):
    first_name: str | None = Field(default=None, min_length=1, max_length=100)
    last_name: str | None = Field(default=None, min_length=1, max_length=100)
    role: EmployeeRole | None = None
    is_active: bool | None = None

    @model_validator(mode="after")
    def reject_explicit_nulls(self) -> "EmployeeUpdate":
        null_fields = REQUIRED_UPDATE_FIELDS & {
            field for field in self.model_fields_set if getattr(self, field) is None
        }
        if null_fields:
            names = ", ".join(sorted(null_fields))
            raise ValueError(f"Fields cannot be null: {names}")
        return self


class EmployeeRead(EmployeeBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime
