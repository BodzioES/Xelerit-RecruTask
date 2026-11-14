from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.db.enums import ServiceType
from app.modules.pricing.models import PricingRule
from app.modules.pricing.schemas import PricingRuleUpdate


def list_rules(db: Session) -> list[PricingRule]:
    return list(db.scalars(select(PricingRule).order_by(PricingRule.service_type)))


def update_rule(db: Session, service_type: ServiceType, payload: PricingRuleUpdate) -> PricingRule:
    rule = db.scalar(select(PricingRule).where(PricingRule.service_type == service_type))
    if rule is None:
        raise NotFoundError("Pricing rule not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(rule, field, value)
    db.commit()
    db.refresh(rule)
    return rule
