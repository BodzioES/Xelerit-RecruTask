from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_provider
from app.db.enums import ServiceType
from app.db.session import get_db
from app.modules.pricing import rules
from app.modules.pricing.schemas import PricingRuleRead, PricingRuleUpdate

router = APIRouter(
    prefix="/provider/pricing-rules",
    tags=["provider: pricing"],
    dependencies=[Depends(get_current_provider)],
)


@router.get("", response_model=list[PricingRuleRead])
def list_pricing_rules(db: Session = Depends(get_db)) -> list[PricingRuleRead]:
    return [PricingRuleRead.model_validate(rule) for rule in rules.list_rules(db)]


@router.patch("/{service_type}", response_model=PricingRuleRead)
def update_pricing_rule(
    service_type: ServiceType,
    payload: PricingRuleUpdate,
    db: Session = Depends(get_db),
) -> PricingRuleRead:
    rule = rules.update_rule(db, service_type, payload)
    return PricingRuleRead.model_validate(rule)
