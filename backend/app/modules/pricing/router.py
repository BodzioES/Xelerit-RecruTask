from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.pricing import rules, service
from app.modules.pricing.schemas import PricingQuoteRead, PricingQuoteRequest, PricingRuleRead

router = APIRouter(prefix="/pricing", tags=["pricing"])


@router.get("/rules", response_model=list[PricingRuleRead])
def list_public_rules(db: Session = Depends(get_db)) -> list[PricingRuleRead]:
    """Current rates, published so the site can show them; editing stays provider-only."""
    return [PricingRuleRead.model_validate(rule) for rule in rules.list_rules(db)]


@router.post("/quote", response_model=PricingQuoteRead)
def quote(payload: PricingQuoteRequest, db: Session = Depends(get_db)) -> PricingQuoteRead:
    return service.calculate_quote(db, payload)
