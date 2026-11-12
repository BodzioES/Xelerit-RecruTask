from enum import StrEnum

from sqlalchemy import Enum as SQLAlchemyEnum


def enum_type(enum_class: type[StrEnum], name: str) -> SQLAlchemyEnum:
    """PostgreSQL native enum that stores lower-case member values, not names."""
    return SQLAlchemyEnum(
        enum_class,
        name=name,
        native_enum=True,
        values_callable=lambda cls: [member.value for member in cls],
        validate_strings=True,
    )
