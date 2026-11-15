import json
import re
from functools import lru_cache
from pathlib import Path

from pydantic import ValidationError as PydanticValidationError

from app.core.config import settings
from app.core.exceptions import UpstreamServiceError, ValidationError
from app.db.enums import PropertyType
from app.modules.assistant import groq_client
from app.modules.assistant.schemas import (
    ModelMovePlan,
    MovePlanItemRead,
    MovePlanRead,
    MovePlanRequest,
)

PROMPT_PATH = Path(__file__).parent / "prompts" / "move_plan_system.md"
FLOOR_PROPERTY_TYPES = frozenset({PropertyType.APARTMENT, PropertyType.OFFICE, PropertyType.RETAIL})
DEFAULT_SUMMARY = "Check the suggested details below and adjust anything that is not right."
REFUSAL = (
    "The assistant can only help with a description of what you are moving. "
    "Please describe the items, the property and the access."
)
INJECTION_THRESHOLD = 0.8

# Control characters (except tab and newline) and our own delimiter tags are removed from the
# customer text, so it cannot close the data block and pose as instructions.
_CONTROL_CHARACTERS = re.compile(r"[\x00-\x08\x0b-\x1f\x7f]")
_DELIMITER_TAGS = re.compile(r"<\s*/?\s*customer_description\s*>", re.IGNORECASE)
# Model output is shown to the customer, so links and contact details are never passed through.
_UNSAFE_OUTPUT = re.compile(r"https?://|www\.|@|<|>|\[|\]\(", re.IGNORECASE)


@lru_cache
def system_prompt() -> str:
    template = PROMPT_PATH.read_text(encoding="utf-8")
    return template.replace("{max_helpers}", str(settings.max_moving_helpers))


def plan_move(payload: MovePlanRequest) -> MovePlanRead:
    """Turn a free-text move description into suggested booking fields.

    The result only pre-fills the wizard: the customer reviews it, and the server still
    calculates prices and availability from the reviewed fields.
    """
    description = _clean_description(payload.description)
    # First line of defence: a dedicated classifier rejects obvious prompt attacks before
    # the text ever reaches the model that follows instructions.
    score = groq_client.injection_score(description)
    if score is not None and score >= INJECTION_THRESHOLD:
        raise ValidationError(REFUSAL)

    user_message = (
        f"The customer is booking: {payload.service_type}.\n"
        "<customer_description>\n"
        f"{description}\n"
        "</customer_description>"
    )
    plan = _parse(groq_client.complete_json(system_prompt(), user_message))
    if not plan.is_moving_request:
        raise ValidationError(REFUSAL)
    return _to_read(plan)


def _clean_description(text: str) -> str:
    text = _CONTROL_CHARACTERS.sub(" ", text)
    text = _DELIMITER_TAGS.sub(" ", text)
    return text.strip()


def _parse(raw: str) -> ModelMovePlan:
    try:
        return ModelMovePlan.model_validate(json.loads(raw))
    except (json.JSONDecodeError, PydanticValidationError) as exc:
        raise UpstreamServiceError("The AI assistant returned an unusable answer") from exc


def _to_read(plan: ModelMovePlan) -> MovePlanRead:
    has_floor = plan.property_type in FLOOR_PROPERTY_TYPES
    floor = plan.floor if has_floor else None
    van_only = plan.suggested_service == "van_driver"
    helpers = None if van_only or plan.helpers is None else plan.helpers

    return MovePlanRead(
        suggested_service=plan.suggested_service,
        property_type=plan.property_type,
        floor=floor,
        # The elevator only matters above the ground floor.
        has_elevator=plan.has_elevator if floor else None,
        boxes_count=plan.boxes_count,
        helpers=min(helpers, settings.max_moving_helpers) if helpers is not None else None,
        items=_safe_items(plan),
        summary=_safe_text(plan.summary) or DEFAULT_SUMMARY,
    )


def _safe_items(plan: ModelMovePlan) -> list[MovePlanItemRead]:
    items: list[MovePlanItemRead] = []
    seen: set[str] = set()
    for item in plan.items:
        name = _safe_text(item.name)
        if not name or name.lower() in seen:
            continue
        seen.add(name.lower())
        items.append(MovePlanItemRead(name=name, quantity=item.quantity))
    return items


def _safe_text(value: str) -> str:
    text = " ".join(value.split())
    return "" if _UNSAFE_OUTPUT.search(text) else text
