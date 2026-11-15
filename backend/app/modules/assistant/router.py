from fastapi import APIRouter, Depends

from app.modules.assistant import groq_client, service
from app.modules.assistant.rate_limit import limit_assistant_calls
from app.modules.assistant.schemas import AssistantStatusRead, MovePlanRead, MovePlanRequest

router = APIRouter(prefix="/assistant", tags=["assistant"])


@router.get("/status", response_model=AssistantStatusRead)
def read_status() -> AssistantStatusRead:
    """Lets the wizard hide the assistant when no AI key is configured."""
    return AssistantStatusRead(enabled=groq_client.is_configured())


@router.post(
    "/move-plan",
    response_model=MovePlanRead,
    dependencies=[Depends(limit_assistant_calls)],
)
def create_move_plan(payload: MovePlanRequest) -> MovePlanRead:
    return service.plan_move(payload)
