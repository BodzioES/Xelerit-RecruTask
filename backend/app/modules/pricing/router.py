from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.pricing import service
from app.modules.pricing.schemas import PricingQuoteRead, PricingQuoteRequest

router = APIRouter(prefix="/pricing", tags=["pricing"])


@router.post("/quote", response_model=PricingQuoteRead)
def quote(payload: PricingQuoteRequest, db: Session = Depends(get_db)) -> PricingQuoteRead:
    return service.calculate_quote(db, payload)
