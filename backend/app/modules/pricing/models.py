from decimal import Decimal

from sqlalchemy import CheckConstraint, Integer, Numeric
from sqlalchemy.orm import Mapped, mapped_column

from app.db.enums import ServiceType
from app.db.mixins import TimestampMixin, UUIDPrimaryKeyMixin
from app.db.session import Base
from app.db.types import enum_type


class PricingRule(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "pricing_rules"
    __table_args__ = (
        CheckConstraint("base_price >= 0", name="ck_pricing_rules_base_price_non_negative"),
        CheckConstraint("hourly_rate >= 0", name="ck_pricing_rules_hourly_rate_non_negative"),
        CheckConstraint("daily_rate >= 0", name="ck_pricing_rules_daily_rate_non_negative"),
        CheckConstraint("price_per_km >= 0", name="ck_pricing_rules_price_per_km_non_negative"),
        CheckConstraint(
            "helper_rate >= 0", name="ck_pricing_rules_helper_rate_non_negative"
        ),
        CheckConstraint(
            "floor_surcharge >= 0",
            name="ck_pricing_rules_floor_surcharge_non_negative",
        ),
        CheckConstraint(
            "no_elevator_surcharge >= 0",
            name="ck_pricing_rules_no_elevator_surcharge_non_negative",
        ),
        CheckConstraint(
            "additional_service_price >= 0",
            name="ck_pricing_rules_additional_service_price_non_negative",
        ),
        CheckConstraint(
            "min_duration_hours > 0", name="ck_pricing_rules_min_duration_positive"
        ),
    )

    service_type: Mapped[ServiceType] = mapped_column(
        enum_type(ServiceType, "service_type"),
        nullable=False,
        unique=True,
    )
    base_price: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0.00"), server_default="0"
    )
    hourly_rate: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0.00"), server_default="0"
    )
    daily_rate: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0.00"), server_default="0"
    )
    price_per_km: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0.00"), server_default="0"
    )
    helper_rate: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0.00"), server_default="0"
    )
    floor_surcharge: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0.00"), server_default="0"
    )
    no_elevator_surcharge: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0.00"), server_default="0"
    )
    additional_service_price: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0.00"), server_default="0"
    )
    min_duration_hours: Mapped[int] = mapped_column(
        Integer, nullable=False, default=4, server_default="4"
    )

    def __repr__(self) -> str:
        return f"PricingRule(id={self.id!r}, service_type={self.service_type!r})"
