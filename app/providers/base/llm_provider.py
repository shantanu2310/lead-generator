from abc import ABC, abstractmethod
from typing import Any


class LLMClient(ABC):
    @abstractmethod
    async def complete_structured(
        self,
        messages: list[dict[str, str]],
        response_model: type,
        temperature: float = 0.0,
        max_tokens: int = 1000,
    ) -> Any:
        ...

    @abstractmethod
    async def complete(
        self,
        messages: list[dict[str, str]],
        temperature: float = 0.0,
        max_tokens: int = 1000,
    ) -> str:
        ...
