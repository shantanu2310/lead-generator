from datetime import UTC, datetime

from pydantic import BaseModel, Field


class Evidence(BaseModel):
    field_name: str
    value: str
    source: str
    source_url: str | None = None
    provider_record_id: str | None = None
    confidence: float = Field(ge=0.0, le=1.0)
    discovered_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class EvidenceCollection(BaseModel):
    items: list[Evidence] = Field(default_factory=list)

    def add(self, evidence: Evidence) -> None:
        self.items.append(evidence)

    def get_by_field(self, field_name: str) -> list[Evidence]:
        return [e for e in self.items if e.field_name == field_name]

    def get_best_by_field(self, field_name: str) -> Evidence | None:
        matches = self.get_by_field(field_name)
        if not matches:
            return None
        return max(matches, key=lambda e: e.confidence)

    def get_confirmed_values(self, field_name: str) -> list[str]:
        seen = set()
        confirmed = []
        for evidence in self.get_by_field(field_name):
            normalized = evidence.value.lower().strip()
            if normalized not in seen:
                seen.add(normalized)
                confirmed.append(evidence.value)
        return confirmed

    def has_cross_source_confirmation(self, field_name: str) -> bool:
        sources = set(e.source for e in self.get_by_field(field_name))
        return len(sources) >= 2
