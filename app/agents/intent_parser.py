from pydantic import BaseModel, Field

from app.core.constants import EntityType, LocationMode


class SearchIntent(BaseModel):
    entity_type: EntityType = Field(
        ..., description="Type of entity being searched for"
    )
    category: str | None = Field(
        None, description="Business category (e.g. florist, dentist, restaurant)"
    )
    industry: str | None = Field(
        None, description="Industry classification"
    )
    location: str | None = Field(
        None, description="Explicit location mentioned in query"
    )
    location_mode: LocationMode = Field(
        ..., description="How location was determined"
    )
    radius_km: float | None = Field(
        None, description="Search radius in kilometers"
    )
    keywords: list[str] = Field(
        default_factory=list,
        description="Positive keywords to match",
    )
    negative_keywords: list[str] = Field(
        default_factory=list,
        description="Keywords to exclude",
    )
    required_contact_fields: list[str] = Field(
        default_factory=list,
        description="Contact fields user requires (email, phone, website)",
    )
    target_count: int = Field(
        default=15, ge=1, le=15, description="Number of leads requested"
    )


INTENT_PARSING_PROMPT = """\
You are an intent parser for a lead generation system.

Given a user's natural language search query, extract structured search criteria.

Rules:
- entity_type: "local_business" for physical locations,
  "company" for online/general businesses, "person" for individuals
- category: the specific business type (e.g. "florist", "dentist")
- location: explicit location name if mentioned, otherwise null
- location_mode: "explicit" if location is in query,
  "user_location" if "near me" or similar, "none" if no location
- keywords: positive search terms from the query
- negative_keywords: terms to exclude
- required_contact_fields: what contact info the user wants
- target_count: number of leads requested, default 15

Examples:
Query: "florist near me"
→ entity_type: "local_business", category: "florist",
  location_mode: "user_location", keywords: ["florist"]

Query: "dentists in Amsterdam"
→ entity_type: "local_business", category: "dentist",
  location: "Amsterdam", location_mode: "explicit"

Query: "SaaS startups in Rotterdam"
→ entity_type: "company", category: "SaaS",
  location: "Rotterdam", location_mode: "explicit"

Query: "marketing agencies in London with email"
→ entity_type: "company", category: "marketing agency",
  location: "London", required_contact_fields: ["email"]
"""
