from pydantic import BaseModel, Field

from app.core.constants import DEFAULT_CANDIDATE_TARGET


class SearchPlan(BaseModel):
    primary_source: str = Field(
        ..., description="Primary discovery source (google_places, web_search)"
    )
    secondary_source: str | None = Field(
        None, description="Secondary source if needed"
    )
    candidate_target: int = Field(
        DEFAULT_CANDIDATE_TARGET, description="Number of candidates to discover"
    )
    requires_location: bool = Field(
        False, description="Whether location coordinates are needed"
    )
    requires_website_analysis: bool = Field(
        False, description="Whether to crawl websites"
    )
    requires_email_enrichment: bool = Field(
        False, description="Whether email discovery is needed"
    )
    requires_phone_enrichment: bool = Field(
        False, description="Whether phone discovery is needed"
    )
    search_queries: list[str] = Field(
        default_factory=list, description="Actual search queries to execute"
    )


SEARCH_PLANNING_PROMPT = """\
You are a search planner for a lead generation system.

Given a parsed search intent, create a search plan that determines \
how candidates will be discovered.

Available sources:
- "google_places": Best for local businesses with physical locations
- "web_search": Best for companies, online businesses

Rules:
- For local_business entity_type: prefer google_places as primary
- For company entity_type: prefer web_search as primary
- candidate_target: always 50-60 to ensure enough candidates
- requires_location: true when entity_type is local_business
- requires_website_analysis: true when we need to verify business identity
- requires_email_enrichment: true when user needs contact info
- search_queries: generate 2-4 varied search queries

Example:
Intent: { entity_type: "local_business", category: "florist",
  location: "Amsterdam", location_mode: "explicit" }
Plan: { primary_source: "google_places",
  secondary_source: "web_search", candidate_target: 50,
  requires_location: true, requires_website_analysis: true,
  search_queries: ["florist Amsterdam", "flower shop Amsterdam"] }
"""
