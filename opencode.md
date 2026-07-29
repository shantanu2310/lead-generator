# Precision Lead Generation Agent

## Project Mission

Build a production-grade AI lead generation agent focused on PRECISION, ACCURACY, and VERIFIED CONTACTABILITY.

This product is NOT a bulk lead scraper.

The system must return a maximum of 10–15 high-confidence leads per user request.

The core product principle is:

> Find many candidates internally. Verify aggressively. Return only the best genuine leads.

Never fabricate leads to reach the requested target count.

If only 7 leads pass verification, return 7.

Accuracy is more important than quantity.

---

# Product Goal

The user provides a natural-language request.

Examples:

* florist near me
* dentists in Amsterdam
* SaaS startups in Rotterdam
* restaurants in Pune without a modern website
* marketing agencies in London
* AI companies in the Netherlands
* find wedding photographers near me
* find logistics companies in Amsterdam with a contact email

The system must:

1. Understand the user's intent.
2. Convert the request into structured search criteria.
3. Create a search plan.
4. Discover 40–60 candidate leads.
5. Normalize candidate data.
6. Remove duplicates.
7. Verify business identity.
8. Verify the business is relevant to the request.
9. Visit and analyze the official website when available.
10. Extract contact information.
11. Verify contact information.
12. Cross-check data between sources.
13. Calculate a deterministic confidence score.
14. Return only the top 10–15 qualified leads.

The LLM must NEVER invent business names, websites, emails, phone numbers, addresses, or people.

---

# Core Product Philosophy

QUALITY OVER QUANTITY.

Never optimize for maximum lead count.

The internal pipeline should behave like:

User requests 15 leads.

Discover approximately 50 candidates.

Remove duplicates.

Remove irrelevant businesses.

Remove inactive businesses.

Verify websites.

Extract contact details.

Verify contact details.

Cross-check source evidence.

Score every lead.

Return up to 15 leads with the highest confidence.

Example:

50 candidates discovered.

43 unique businesses.

35 active businesses.

28 relevant businesses.

19 successfully enriched.

13 pass the verification threshold.

Return 13 leads.

Do NOT fabricate 2 additional leads to reach 15.

---

# Technology Stack

Use the following stack unless there is a strong technical reason to change it.

## Backend

* Python 3.12+
* FastAPI
* Uvicorn
* Pydantic v2
* SQLAlchemy 2
* Alembic

## AI

Use an LLM with structured JSON output and tool-calling support.

The LLM is responsible only for:

* intent understanding
* query interpretation
* search planning
* semantic relevance classification
* website content understanding when deterministic extraction is insufficient
* concise explanation generation

The LLM must NOT be used as the source of lead data.

## Database

* PostgreSQL
* PostgreSQL pg_trgm extension for fuzzy duplicate detection

## Cache

* Redis

Use Redis for:

* search result caching
* temporary pipeline state
* provider response caching
* rate-limit state

## Local Business Discovery

Primary source:

* Google Places API

Use:

* Text Search
* Nearby Search when appropriate
* Place Details

## Web Search

Use a configurable search provider abstraction.

Initial provider:

* Brave Search API

The implementation must allow additional search providers later.

## Website Crawling

Primary:

* Crawl4AI

Browser fallback:

* Playwright

Do not launch Playwright for every website.

Use Playwright only when:

* JavaScript rendering is required
* normal HTTP crawling fails
* content is dynamically loaded
* contact information is hidden behind browser interaction

## Email Discovery and Verification

Primary provider:

* Hunter API

Create provider abstractions so additional verification providers can be added later.

## Phone Validation

Use:

* phonenumbers

Phone validation must include:

* normalization
* country validation
* possible-number validation
* valid-number validation

## Monitoring

Prepare the application for:

* Sentry
* OpenTelemetry
* structured JSON logging

---

# Required Architecture

Use a modular pipeline architecture.

The system must NOT be implemented as one large AI agent.

Required pipeline:

Natural Language Query

↓

Intent Parser

↓

Search Planner

↓

Source Router

↓

Candidate Discovery

↓

Normalization

↓

Deduplication

↓

Business Verification

↓

Website Intelligence

↓

Contact Enrichment

↓

Contact Verification

↓

Cross-Source Validation

↓

Lead Scoring

↓

Top Lead Selection

↓

Final Response

Each stage must be independently testable.

---

# Project Folder Structure

Create and maintain the following architecture:

```text
app/
├── main.py
├── config.py
├── dependencies.py
│
├── api/
│   ├── __init__.py
│   ├── routes/
│   │   ├── health.py
│   │   └── leads.py
│   └── schemas/
│       ├── requests.py
│       └── responses.py
│
├── core/
│   ├── __init__.py
│   ├── logging.py
│   ├── exceptions.py
│   ├── constants.py
│   └── security.py
│
├── agents/
│   ├── __init__.py
│   ├── intent_parser.py
│   ├── search_planner.py
│   └── relevance_classifier.py
│
├── pipeline/
│   ├── __init__.py
│   ├── orchestrator.py
│   ├── discovery.py
│   ├── normalization.py
│   ├── deduplication.py
│   ├── business_verification.py
│   ├── website_intelligence.py
│   ├── enrichment.py
│   ├── contact_verification.py
│   ├── cross_validation.py
│   ├── scoring.py
│   └── selection.py
│
├── providers/
│   ├── __init__.py
│   │
│   ├── base/
│   │   ├── search_provider.py
│   │   ├── business_provider.py
│   │   ├── email_provider.py
│   │   └── crawler_provider.py
│   │
│   ├── google_places/
│   │   ├── client.py
│   │   ├── provider.py
│   │   └── schemas.py
│   │
│   ├── brave/
│   │   ├── client.py
│   │   └── provider.py
│   │
│   ├── hunter/
│   │   ├── client.py
│   │   ├── provider.py
│   │   └── schemas.py
│   │
│   └── crawling/
│       ├── crawl4ai_provider.py
│       └── playwright_provider.py
│
├── services/
│   ├── __init__.py
│   ├── intent_service.py
│   ├── search_service.py
│   ├── website_service.py
│   ├── enrichment_service.py
│   ├── verification_service.py
│   └── scoring_service.py
│
├── models/
│   ├── __init__.py
│   ├── lead.py
│   ├── evidence.py
│   ├── search.py
│   └── provider_result.py
│
├── database/
│   ├── __init__.py
│   ├── session.py
│   ├── base.py
│   └── repositories/
│       ├── lead_repository.py
│       └── search_repository.py
│
├── utils/
│   ├── __init__.py
│   ├── email.py
│   ├── phone.py
│   ├── domain.py
│   ├── text.py
│   ├── urls.py
│   └── similarity.py
│
└── tests/
    ├── unit/
    ├── integration/
    └── fixtures/
```

Do not place all logic inside route handlers.

Do not create god classes.

Do not create one 1,000-line service file.

Keep provider-specific logic inside provider modules.

---

# API Requirements

Create the primary endpoint:

POST /api/v1/leads/search

Request:

```json
{
  "query": "florist near me",
  "latitude": 52.3676,
  "longitude": 4.9041,
  "max_leads": 15
}
```

Latitude and longitude are optional.

They are required when the user's query depends on the user's current location.

Example:

* near me
* nearby
* close to me
* in my area

If the query uses "near me" and coordinates are missing, return a clear validation response requesting location information.

Do not silently guess the user's location.

Maximum `max_leads` is 15.

Default `max_leads` is 15.

The system may return fewer leads.

---

# Intent Parser

The Intent Parser converts natural language into a strict Pydantic model.

Create a model similar to:

```python
class SearchIntent(BaseModel):
    entity_type: Literal["local_business", "company", "person"]
    category: str | None
    industry: str | None
    location: str | None
    location_mode: Literal["explicit", "user_location", "none"]
    radius_km: float | None
    keywords: list[str]
    negative_keywords: list[str]
    required_contact_fields: list[str]
    target_count: int
```

The LLM must return structured output matching the schema.

Never parse LLM output using fragile string splitting.

Validate all LLM responses with Pydantic.

If validation fails:

1. Retry once with schema correction instructions.
2. If it fails again, raise a controlled pipeline error.

---

# Search Planner

The Search Planner decides how candidates should be discovered.

Example:

Query:

"florist near me"

Plan:

```json
{
  "primary_source": "google_places",
  "secondary_source": "web_search",
  "candidate_target": 50,
  "requires_location": true,
  "requires_website_analysis": true,
  "requires_email_enrichment": true
}
```

The Search Planner must not contain hard-coded logic only for florists.

It must work for different business categories.

Prefer deterministic routing rules.

Use the LLM only when query semantics require interpretation.

---

# Candidate Discovery

The discovery stage must over-fetch candidates.

Default:

```python
DEFAULT_CANDIDATE_TARGET = 50
MAX_CANDIDATE_TARGET = 60
```

The final result target is NOT the candidate target.

For local businesses:

Use Google Places as the primary discovery source.

For company research:

Use web search and configurable business-data providers.

Every discovered candidate must include source metadata.

Example:

```json
{
  "name": "Example Flowers",
  "source": "google_places",
  "source_id": "google-place-id",
  "discovered_at": "ISO_TIMESTAMP"
}
```

Never create a candidate from LLM knowledge.

---

# Normalization

Normalize all candidates before verification.

Normalize:

* company name
* domain
* website URL
* email
* phone
* address
* country
* social URLs

Domain normalization:

```text
https://www.example.com/
http://example.com
www.example.com

becomes:

example.com
```

Phone numbers must be stored in E.164 format when possible.

Emails must be lowercase.

Trim unnecessary whitespace.

Preserve original provider values in evidence metadata.

---

# Deduplication

Deduplicate candidates before expensive enrichment.

Use exact matching first.

Exact duplicate indicators:

* same provider source ID
* same Google Place ID
* same normalized domain
* same normalized phone
* same verified email

Then use fuzzy matching.

Use PostgreSQL pg_trgm or an equivalent similarity implementation.

Possible duplicate rule:

Company name similarity >= 0.90

AND

Address similarity >= 0.85

Do not automatically merge uncertain duplicates.

Mark uncertain duplicates for comparison.

The merge process must preserve evidence from all records.

---

# Business Verification

Every candidate must pass business identity verification.

Check:

* business status
* category match
* location match
* official website availability
* website identity
* phone consistency
* address consistency

Reject permanently closed businesses.

A business must not receive a high confidence score when the website belongs to another company.

Website identity verification should compare:

* company name
* phone
* address
* domain
* page title
* structured data
* website content

---

# Website Intelligence

The crawler must prioritize:

1. Homepage
2. Contact page
3. About page
4. Team page when relevant

Do not crawl an entire website without a reason.

Default maximum pages per candidate:

```python
MAX_WEBSITE_PAGES = 5
```

Extract deterministic data first.

Extraction order:

1. JSON-LD
2. Schema.org structured data
3. HTML metadata
4. mailto links
5. tel links
6. visible DOM text
7. regex extraction
8. semantic LLM extraction only when required

Extract:

* company name
* emails
* phone numbers
* address
* company description
* services
* categories
* social links
* team information when relevant
* contact page URL

Do not use an LLM to extract an email that is already available in a mailto link.

Do not use an LLM for basic regex-compatible extraction.

---

# Contact Enrichment

Contact enrichment must use a waterfall strategy.

Email discovery order:

1. Official website
2. Contact page
3. Hunter
4. Future configured providers

Stop when a sufficiently high-confidence verified contact is found.

Do not call every paid provider for every lead.

Optimize provider cost.

Example:

Website email found.

↓

Verify email.

↓

Email valid.

↓

Stop email enrichment.

Do not call Hunter discovery unnecessarily after a verified official website email is found.

---

# Email Verification

Every email returned to the user must have verification metadata.

Required statuses:

* valid
* invalid
* risky
* accept_all
* unknown

Never present an invalid email as a verified contact.

High-confidence results should prefer:

* valid business-domain email
* email discovered on official website
* email confirmed by verification provider

Free email providers such as Gmail should receive lower business-contact confidence unless the email is explicitly published on the official business website.

Store:

```json
{
  "value": "hello@example.com",
  "status": "valid",
  "source": "official_website",
  "verification_provider": "hunter",
  "confidence": 96
}
```

---

# Phone Verification

Normalize phones using the phonenumbers library.

Check:

* possible number
* valid number
* country match

Cross-source phone verification is important.

Example:

Google Places phone:

+31201234567

Official website phone:

+31201234567

This is strong evidence.

Phone confidence should increase when multiple independent sources agree.

Do not claim that a phone number is reachable unless the system actually performs a reachability check.

Use the term "cross-verified" when sources agree.

---

# Evidence Model

Every important lead field must preserve provenance.

Create an evidence model similar to:

```python
class Evidence(BaseModel):
    field_name: str
    value: str
    source: str
    source_url: str | None
    provider_record_id: str | None
    confidence: float
    discovered_at: datetime
```

Example:

```json
{
  "field_name": "phone",
  "value": "+31201234567",
  "source": "official_website",
  "source_url": "https://example.com/contact",
  "confidence": 0.95
}
```

Never overwrite evidence when another source confirms the same value.

Preserve both evidence records.

This allows cross-source verification.

---

# Cross-Source Validation

Cross-source validation is a core product feature.

Compare values between:

* Google Places
* official website
* web search results
* Hunter
* future providers

Increase confidence when independent sources agree.

Example:

Google Places business name matches official website.

Google Places phone matches official website.

Google Places address matches website structured data.

This should create a strong identity confidence score.

Conflicting data must reduce confidence.

Do not hide conflicts.

Store conflict information internally.

---

# Relevance Classification

The lead must match the user's actual request.

Example user query:

"florist near me"

Valid:

* flower shop
* florist
* floral designer
* wedding flower service

Potentially invalid:

* artificial plant wholesaler
* gardening equipment shop
* flower photography studio

Use deterministic category matching first.

Use the LLM semantic classifier for ambiguous cases.

The relevance classifier must return structured output:

```json
{
  "matches_intent": true,
  "relevance_score": 96,
  "reason": "The business actively provides florist and flower delivery services."
}
```

The LLM classification is only one scoring signal.

It must not independently approve a lead.

---

# Lead Scoring

Lead scoring must be deterministic.

Do not ask the LLM to generate the final confidence score.

Initial scoring model:

```text
Category / Intent Match        25
Business Active                15
Website Identity Verified      15
Phone Cross-Verified           15
Email Verified                 15
Location Match                 10
Recent Business Signal          5
----------------------------------
Total                         100
```

Create scoring logic as pure Python functions.

Example:

```python
def calculate_lead_score(signals: LeadSignals) -> int:
    score = 0

    if signals.category_match:
        score += 25

    if signals.business_active:
        score += 15

    if signals.website_identity_verified:
        score += 15

    if signals.phone_cross_verified:
        score += 15

    if signals.email_verified:
        score += 15

    if signals.location_match:
        score += 10

    if signals.recent_business_signal:
        score += 5

    return score
```

Minimum return score:

```python
MINIMUM_LEAD_SCORE = 80
```

Do not return leads below the minimum threshold by default.

Scoring weights must be centralized in configuration.

Do not scatter scoring numbers across files.

---

# Lead Selection

After all leads are scored:

1. Remove rejected leads.
2. Remove leads below the minimum score.
3. Sort by score descending.
4. Use evidence strength as a secondary sort.
5. Select a maximum of 15 leads.

Never duplicate a company in final results.

Never add low-quality leads to fill the target count.

---

# Final Lead Response

The API should return:

```json
{
  "query": "florist near me",
  "candidates_checked": 53,
  "qualified_leads_found": 12,
  "requested_max_leads": 15,
  "leads": [
    {
      "business_name": "Example Flowers",
      "website": "https://example.com",
      "email": "hello@example.com",
      "phone": "+31201234567",
      "address": "Amsterdam, Netherlands",
      "confidence_score": 97,
      "relevance_reason": "Active florist offering flower delivery and floral services.",
      "verification": {
        "business_active": true,
        "website_identity_verified": true,
        "email_verified": true,
        "phone_cross_verified": true,
        "location_match": true
      }
    }
  ]
}
```

Do not expose internal API keys.

Do not expose raw provider payloads.

Do not expose internal LLM prompts.

---

# Provider Design Rules

All external providers must use interfaces or abstract base classes.

Example:

```python
class BusinessDiscoveryProvider(ABC):

    @abstractmethod
    async def search(
        self,
        plan: SearchPlan,
    ) -> list[CandidateLead]:
        ...
```

Provider clients are responsible for:

* HTTP communication
* authentication
* timeouts
* provider response parsing
* provider-specific errors

Provider services must not contain business scoring logic.

Pipeline modules must not contain raw HTTP request code.

---

# HTTP Client Rules

Use async HTTP clients.

Prefer httpx.AsyncClient.

Configure:

* connection timeout
* read timeout
* retry policy
* connection pooling

Do not create a new HTTP client for every request.

Reuse clients through application dependencies or provider lifecycle management.

Never use requests inside async FastAPI pipeline code.

---

# Retry Rules

Retry only transient failures.

Retry:

* HTTP 429
* HTTP 500
* HTTP 502
* HTTP 503
* HTTP 504
* temporary network failures

Do not retry:

* HTTP 400
* HTTP 401
* HTTP 403 unless provider documentation explicitly requires a token refresh
* validation errors

Use exponential backoff with jitter.

All retries must have a maximum attempt limit.

Never create infinite retry loops.

---

# Rate Limit Rules

Respect provider rate limits.

Create provider-specific rate-limit handling.

When receiving HTTP 429:

1. Check Retry-After.
2. Wait when reasonable.
3. Retry within the configured attempt limit.
4. Record the rate-limit event.

Do not aggressively parallelize paid provider calls.

---

# Concurrency

Use asyncio for I/O-bound operations.

Website verification and provider calls may run concurrently.

Use semaphores to limit concurrency.

Example:

```python
WEBSITE_CONCURRENCY = 5
PROVIDER_CONCURRENCY = 5
```

Do not launch 50 Playwright browsers simultaneously.

Do not use multiprocessing for normal HTTP operations.

---

# Database Requirements

Create tables for:

* searches
* search_intents
* candidate_leads
* leads
* lead_evidence
* provider_results
* verification_results

Store timestamps in UTC.

Use UUID primary keys.

Important lead fields should include:

* id
* business_name
* normalized_name
* website
* normalized_domain
* email
* normalized_email
* phone
* normalized_phone
* address
* latitude
* longitude
* category
* business_status
* relevance_score
* confidence_score
* created_at
* updated_at

Do not store API secrets in the database.

---

# Configuration

All secrets must come from environment variables.

Required configuration should include:

```text
DATABASE_URL
REDIS_URL
LLM_API_KEY
LLM_MODEL
GOOGLE_PLACES_API_KEY
BRAVE_SEARCH_API_KEY
HUNTER_API_KEY
SENTRY_DSN
```

Create `.env.example`.

Never commit `.env`.

Never hard-code API keys.

Use Pydantic Settings for application configuration.

Fail fast during startup when critical configuration is missing.

---

# Logging

Use structured logging.

Every search should have a search ID.

Example context:

```json
{
  "search_id": "uuid",
  "pipeline_stage": "email_verification",
  "candidate_id": "uuid",
  "provider": "hunter"
}
```

Never log:

* API keys
* authorization headers
* complete provider credentials

Log pipeline progress.

Example:

```text
Search started
Intent parsed
Search plan created
52 candidates discovered
44 candidates after deduplication
31 candidates passed business verification
18 candidates enriched
13 candidates passed scoring threshold
Search completed
```

---

# Error Handling

Create application-specific exceptions.

Examples:

* IntentParsingError
* LocationRequiredError
* ProviderAuthenticationError
* ProviderRateLimitError
* ProviderUnavailableError
* WebsiteCrawlError
* VerificationError
* PipelineError

Do not expose Python stack traces through API responses.

Return useful API errors.

Example:

```json
{
  "error": {
    "code": "LOCATION_REQUIRED",
    "message": "Your search uses 'near me'. Latitude and longitude are required."
  }
}
```

---

# Testing Requirements

Every major pipeline stage must have unit tests.

Required tests:

* intent parsing
* domain normalization
* email normalization
* phone normalization
* exact duplicate detection
* fuzzy duplicate detection
* scoring
* minimum score filtering
* lead selection
* location-required validation

Provider integrations must be mockable.

Do not call paid APIs in unit tests.

Use fixtures for provider responses.

Create integration tests separately.

The scoring engine must have deterministic tests.

Example:

```python
def test_fully_verified_lead_scores_100():
    ...
```

Example:

```python
def test_lead_below_80_is_not_returned():
    ...
```

---

# Development Rules

Before implementing a feature:

1. Inspect the existing project structure.
2. Identify the correct module.
3. Reuse existing abstractions.
4. Avoid duplicate functionality.
5. Implement the smallest complete solution.
6. Add or update tests.
7. Run relevant tests.
8. Check for import and typing errors.

Do not rewrite unrelated files.

Do not make unnecessary architecture changes.

Do not remove working code without a reason.

Do not silently change API contracts.

When changing an API contract, update:

* Pydantic schemas
* route implementation
* tests
* documentation

---

# Code Style

Use Python type hints everywhere practical.

Prefer:

```python
async def verify_lead(lead: CandidateLead) -> VerificationResult:
    ...
```

Avoid:

```python
async def verify_lead(lead):
    ...
```

Use descriptive names.

Avoid meaningless names such as:

* data
* temp
* x
* obj
* thing

when a domain-specific name is possible.

Prefer small focused functions.

Use dependency injection for providers.

Use Pydantic models at system boundaries.

Use dataclasses or Pydantic models for structured internal data.

Avoid untyped dictionaries for important domain objects.

---

# AI Safety and Hallucination Rules

This section is critical.

The LLM must never create lead data from its own knowledge.

Never ask:

"Generate 15 florists in Amsterdam."

Instead:

"Classify whether this discovered business matches the user's florist search intent."

The following fields require external evidence:

* business name
* website
* email
* phone
* address
* company identity
* person identity

If evidence does not exist, the field must be null or excluded.

Never guess email patterns.

Do not generate:

[firstname.lastname@company.com](mailto:firstname.lastname@company.com)

unless a provider or official source explicitly discovers the email.

Never infer phone numbers.

Never invent websites.

Never invent addresses.

Never mark a lead verified only because an LLM says it appears legitimate.

---

# Performance Goal

Initial V1 target:

* Maximum final leads: 15
* Typical candidate discovery: 40–60
* Maximum website pages per candidate: 5
* Minimum lead score: 80
* Concurrent website processing: configurable
* Provider calls cached when appropriate

Accuracy is more important than response speed.

However, avoid unnecessary sequential operations.

Parallelize independent I/O operations safely.

---

# Cost Control

Paid provider calls must be minimized.

Before calling a paid enrichment provider:

1. Check cached results.
2. Check official website data.
3. Check whether the field is already verified.
4. Only call the provider if enrichment is still required.

Do not enrich rejected or obviously irrelevant candidates.

Pipeline order should reduce candidates before expensive provider calls.

Correct:

Discovery

↓

Deduplication

↓

Basic relevance

↓

Business verification

↓

Website extraction

↓

Paid enrichment

Wrong:

Discovery

↓

Call Hunter for all 60 businesses

↓

Later discover 30 businesses were irrelevant

---

# Initial Implementation Order

Build the project in phases.

## Phase 1

Create:

* FastAPI application
* configuration
* health endpoint
* Pydantic schemas
* logging
* PostgreSQL setup
* Alembic
* core domain models

## Phase 2

Implement:

* natural-language intent parser
* structured SearchIntent
* location-required validation
* search planner

## Phase 3

Implement:

* Google Places provider
* candidate discovery
* normalization
* exact deduplication
* fuzzy deduplication

## Phase 4

Implement:

* Crawl4AI provider
* website page discovery
* website extraction
* Playwright fallback
* website identity verification

## Phase 5

Implement:

* Hunter provider
* email discovery waterfall
* email verification
* phone normalization
* phone cross-verification

## Phase 6

Implement:

* evidence model
* cross-source validation
* deterministic scoring
* lead selection

## Phase 7

Implement:

* complete pipeline orchestrator
* POST /api/v1/leads/search
* integration tests
* structured pipeline logging

Do not attempt to build every feature in one giant change.

Complete and verify each phase before moving to the next.

---

# Definition of Done

The V1 is complete when the following request works:

```json
{
  "query": "florist near me",
  "latitude": 52.3676,
  "longitude": 4.9041,
  "max_leads": 15
}
```

The system must:

1. Parse the request.
2. Detect a local business search.
3. Use the supplied coordinates.
4. Discover real florist candidates.
5. Normalize candidates.
6. Remove duplicates.
7. Reject closed or irrelevant businesses.
8. Analyze official websites.
9. Extract emails and phones.
10. Verify contact information.
11. Cross-check evidence.
12. Score each lead.
13. Return no more than 15 leads.
14. Return only leads scoring at least 80.
15. Return fewer than 15 when insufficient verified leads exist.

The final system must prioritize genuine, usable leads over lead volume.

When making implementation decisions, always ask:

> Does this improve the probability that the final 10–15 leads are real, relevant, active, and contactable?

If the answer is no, it is not a priority for V1.
