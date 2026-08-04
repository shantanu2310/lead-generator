import json

import httpx
from pydantic import BaseModel

from app.config import settings
from app.core.exceptions import ProviderAuthenticationError, ProviderUnavailableError
from app.core.logging import get_logger
from app.providers.base.llm_provider import LLMClient

logger = get_logger()


class OpenAIClient(LLMClient):
    @property
    def api_key(self) -> str:
        return settings.llm_api_key

    @property
    def model(self) -> str:
        return settings.llm_model

    def __init__(self) -> None:
        self.client = httpx.AsyncClient(
            base_url="https://api.openai.com",
            headers={"Content-Type": "application/json"},
            timeout=60.0,
        )

    async def close(self) -> None:
        await self.client.aclose()

    async def complete(
        self,
        messages: list[dict[str, str]],
        temperature: float = 0.0,
        max_tokens: int = 1000,
    ) -> str:
        if not self.api_key:
            raise ProviderAuthenticationError("openai")

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        try:
            response = await self.client.post(
                "/v1/chat/completions",
                json=payload,
                headers={"Authorization": f"Bearer {self.api_key}"},
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 401:
                raise ProviderAuthenticationError("openai")
            raise ProviderUnavailableError("openai")
        except httpx.RequestError:
            raise ProviderUnavailableError("openai")

    async def complete_structured(
        self,
        messages: list[dict[str, str]],
        response_model: type[BaseModel],
        temperature: float = 0.0,
        max_tokens: int = 1000,
    ) -> BaseModel:
        schema_json = response_model.model_json_schema()
        schema_str = json.dumps(schema_json, indent=2)

        system_message = (
            f"{messages[0]['content']}\n\n"
            f"You MUST respond with valid JSON matching this schema:\n"
            f"{schema_str}\n\n"
            "Return ONLY the JSON object. No markdown, no explanation."
        )

        structured_messages = [{"role": "system", "content": system_message}]
        for msg in messages[1:]:
            structured_messages.append(msg)

        response_text = await self.complete(
            structured_messages, temperature=temperature, max_tokens=max_tokens
        )

        cleaned = response_text.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()

        parsed = json.loads(cleaned)
        return response_model.model_validate(parsed)


_llm_client: OpenAIClient | None = None


def get_llm_client() -> OpenAIClient:
    global _llm_client
    if _llm_client is None:
        _llm_client = OpenAIClient()
    return _llm_client
