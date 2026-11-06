from pydantic import BaseModel, Field

from app.core.constants import DEFAULT_CANDIDATE_TARGET


class SearchPlan(BaseModel):
    primary_source: str = Field(
        ...,
        description=(
            "Primary discovery source (google_places, web_search, graph8_people)"
        ),
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
    # Structured intent copied in by IntentService (not chosen by the LLM).
    category: str | None = None
    location: str | None = None
    job_title: str | None = None
    job_title_variants: list[str] = Field(
        default_factory=list,
        description="Alternate titles for the same role (any_of match)",
    )
    seniority_levels: list[str] = Field(
        default_factory=list,
        description="Derived seniority filter values (empty = no filter)",
    )


SEARCH_PLANNING_PROMPT = """\
You are a search planner for a lead generation system.

Given a parsed search intent, create a search plan that determines \
how candidates will be discovered.

Available sources:
- "google_places": Best for local businesses with physical locations
- "web_search": Best for companies, online businesses
- "graph8_people": B2B people index (LinkedIn profiles) - used for person searches
- "graph8_companies": B2B company index - used as a fallback

Rules:
- For local_business entity_type: prefer google_places as primary
- For company entity_type: prefer web_search as primary
- For person entity_type (job titles like "HR managers"): prefer graph8_people
  as primary with google_places as secondary
- For HR consultancies, recruitment agencies, and staffing firms, search for companies
  providing the requested service and include location when supplied.
- candidate_target: always 50-60 to ensure enough candidates
- requires_location: true when entity_type is local_business
- requires_website_analysis: true when we need to verify business identity
- requires_email_enrichment: true when user needs contact info
- search_queries: generate 2-4 varied search queries
- Every search query MUST include the location text when location is present,
  e.g. "recruitment agency in Amsterdam". Start with the canonical form
  "{category} in {location}" when both are known.

Example:
Intent: { entity_type: "local_business", category: "florist",
  location: "Amsterdam", location_mode: "explicit" }
Plan: { primary_source: "google_places",
  secondary_source: "web_search", candidate_target: 50,
  requires_location: true, requires_website_analysis: true,
  search_queries: ["florist in Amsterdam", "flower shop in Amsterdam"] }
"""
