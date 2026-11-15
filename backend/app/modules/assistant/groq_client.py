import logging

import httpx
from pydantic import BaseModel, ConfigDict, Field
from pydantic import ValidationError as PydanticValidationError

from app.core.config import settings
from app.core.exceptions import ServiceUnavailableError, UpstreamServiceError

logger = logging.getLogger(__name__)

REQUEST_TIMEOUT_SECONDS = 20.0
# Reasoning models spend part of the budget thinking before the JSON answer.
MAX_OUTPUT_TOKENS = 1500


class _Message(BaseModel):
    model_config = ConfigDict(extra="ignore")

    content: str = Field(min_length=1)


class _Choice(BaseModel):
    model_config = ConfigDict(extra="ignore")

    message: _Message


class _CompletionResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    choices: list[_Choice] = Field(min_length=1)


def is_configured() -> bool:
    return bool(settings.groq_api_key.strip())


def complete_json(system_prompt: str, user_message: str) -> str:
    """Ask the chat model for a JSON object and return its raw text."""
    body = {
        "model": settings.groq_model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        # Low temperature: the task is extraction, not creative writing.
        "temperature": 0.1,
        "max_tokens": MAX_OUTPUT_TOKENS,
        "response_format": {"type": "json_object"},
    }
    return _chat(body)


def injection_score(text: str) -> float | None:
    """Probability (0-1) that the text is a prompt attack, from Groq's Prompt Guard model.

    Returns None when the classifier is unavailable; the caller then relies on the other
    defences (system prompt rules and strict output validation) instead of failing.
    """
    body = {
        "model": settings.groq_guard_model,
        "messages": [{"role": "user", "content": text}],
    }
    try:
        return float(_chat(body))
    except (UpstreamServiceError, ValueError):
        logger.warning("Prompt Guard is unavailable; continuing without the classifier")
        return None


def _chat(body: dict[str, object]) -> str:
    api_key = settings.groq_api_key.strip()
    if not api_key:
        raise ServiceUnavailableError("The AI assistant is not configured")

    try:
        with _http_client() as client:
            response = client.post(
                f"{settings.groq_base_url.rstrip('/')}/chat/completions",
                json=body,
                headers={"Authorization": f"Bearer {api_key}"},
            )
            response.raise_for_status()
        payload = _CompletionResponse.model_validate(response.json())
    except httpx.HTTPStatusError as exc:
        # Never log the request body: it contains the customer's own words.
        logger.warning("Groq returned HTTP %s", exc.response.status_code)
        raise UpstreamServiceError("The AI assistant is unavailable right now") from exc
    except (httpx.HTTPError, ValueError, PydanticValidationError) as exc:
        logger.warning("Groq request failed: %s", type(exc).__name__)
        raise UpstreamServiceError("The AI assistant is unavailable right now") from exc

    return payload.choices[0].message.content


def _http_client() -> httpx.Client:
    return httpx.Client(timeout=REQUEST_TIMEOUT_SECONDS)
