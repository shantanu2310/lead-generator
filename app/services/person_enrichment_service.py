from dataclasses import dataclass, field
from urllib.parse import urlparse

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.constants import TimelineEventType
from app.core.logging import get_logger
from app.models.lead import Contact, Lead
from app.models.pipeline import TimelineEvent
from app.providers.base.contact_provider import (
    CompanyRecord,
    ContactDiscoveryProvider,
    PersonRecord,
)

logger = get_logger()

# Titles ranked best-first: earlier match wins when ordering candidates.
DECISION_MAKER_TITLES: tuple[str, ...] = (
    "owner",
    "founder",
    "proprietor",
    "ceo",
    "chief",
    "president",
    "partner",
    "managing director",
    "general manager",
    "director",
    "head",
    "manager",
)

# graph8 company fields -> Lead columns (only empty lead fields get filled).
COMPANY_FIELD_MAP: dict[str, str] = {
    "industry": "industry",
    "employee_count": "employee_count",
    "revenue": "revenue",
    "country": "country",
    "state": "state",
    "city": "city",
    "logo_url": "company_logo_url",
}


@dataclass
class PersonEnrichmentResult:
    matches_found: int = 0
    contacts_created: int = 0
    contacts_skipped: int = 0
    company_enriched: bool = False
    company_fields_filled: list[str] = field(default_factory=list)
    contacts: list[Contact] = field(default_factory=list)
    message: str = ""


def domain_from_url(url: str | None) -> str | None:
    """Extract a bare hostname (www. stripped) from a URL or bare domain."""
    if not url:
        return None
    candidate = url.strip()
    if not candidate:
        return None
    if "://" not in candidate:
        candidate = f"https://{candidate}"
    try:
        host = urlparse(candidate).hostname or ""
    except ValueError:
        return None
    host = host.lower().strip(".")
    return host.removeprefix("www.") or None


def _title_rank(person: PersonRecord) -> int:
    title = (person.job_title or "").lower()
    if not title:
        return len(DECISION_MAKER_TITLES) + 1
    for index, keyword in enumerate(DECISION_MAKER_TITLES):
        if keyword in title:
            return index
    return len(DECISION_MAKER_TITLES)


def _contact_key(person: PersonRecord) -> str | None:
    if person.linkedin_url:
        return f"li:{person.linkedin_url.lower().rstrip('/')}"
    if person.email:
        return f"em:{person.email.lower().strip()}"
    return None


class PersonEnrichmentService:
    """Fills a lead's contacts (with LinkedIn profiles) and company fields from graph8."""

    def __init__(self, provider: ContactDiscoveryProvider) -> None:
        self.provider = provider

    async def close(self) -> None:
        await self.provider.close()

    async def enrich_lead(self, db: AsyncSession, lead: Lead) -> PersonEnrichmentResult:
        domain = lead.normalized_domain or domain_from_url(lead.website)
        company_name = lead.business_name

        # 1. Find people at the company (domain first, name fallback).
        people = await self.provider.search_people_by_company(
            domain=domain,
            company_name=company_name,
            limit=max(settings.graph8_max_contacts * 3, 30),
        )

        # 2. Last resort: look the lead's own email up for a person profile.
        if not people and lead.email:
            person = await self.provider.lookup_person_by_email(lead.email)
            if person:
                people = [person]

        # 3. Load existing contacts so re-running never duplicates.
        existing = (
            (await db.execute(select(Contact).where(Contact.lead_id == lead.id)))
            .scalars()
            .all()
        )
        seen_keys: set[str] = set()
        for contact in existing:
            if contact.linkedin_url:
                seen_keys.add(f"li:{contact.linkedin_url.lower().rstrip('/')}")
            if contact.email:
                seen_keys.add(f"em:{contact.email.lower().strip()}")

        # 4. Collapse in-run duplicates (same LinkedIn/email) preferring richer
        #    records, drop people with no identifier at all, then rank
        #    (decision-makers first, confidence second) and cap the list.
        best_by_key: dict[str, PersonRecord] = {}
        for person in people:
            key = _contact_key(person)
            if key is None:
                continue  # neither LinkedIn nor email -> unusable for outreach
            current = best_by_key.get(key)
            if current is None or self._preference(person) > self._preference(current):
                best_by_key[key] = person

        ranked = sorted(
            best_by_key.values(), key=lambda p: (_title_rank(p), -p.confidence)
        )
        capped = ranked[: settings.graph8_max_contacts]

        has_primary = any(c.is_primary for c in existing)
        created: list[Contact] = []
        skipped = 0

        for person in capped:
            key = _contact_key(person)
            if key is None or key in seen_keys:
                skipped += 1
                continue

            name = person.full_name or " ".join(
                p for p in (person.first_name, person.last_name) if p
            ).strip()
            if not name:
                skipped += 1
                continue

            contact = Contact(
                lead_id=lead.id,
                company_id=lead.company_id,
                name=name,
                job_title=person.job_title,
                email=person.email,
                phone=person.phone,
                linkedin_url=person.linkedin_url,
                linkedin_headline=person.headline,
                seniority=person.seniority,
                department=person.department,
                is_primary=not has_primary,
            )
            if contact.is_primary:
                has_primary = True
            db.add(contact)
            created.append(contact)
            seen_keys.add(key)

        # 5. Enrich the lead's company fields (only ones still empty).
        company, filled_fields = await self._enrich_company(lead, domain, company_name)

        await db.flush()

        matches = len(ranked)
        if created or filled_fields:
            description_parts = []
            if created:
                with_linkedin = sum(1 for c in created if c.linkedin_url)
                description_parts.append(
                    f"graph8 added {len(created)} contact(s)"
                    + (f" ({with_linkedin} with LinkedIn)" if with_linkedin else "")
                )
            if filled_fields:
                description_parts.append(
                    "company fields filled: " + ", ".join(filled_fields)
                )
            db.add(
                TimelineEvent(
                    lead_id=lead.id,
                    company_id=lead.company_id,
                    event_type=TimelineEventType.CONTACT_FOUND.value,
                    description=" — ".join(description_parts).capitalize(),
                    event_metadata={
                        "source": "graph8",
                        "matches_found": matches,
                        "contacts_created": len(created),
                        "company_fields": filled_fields,
                    },
                )
            )
            await db.flush()

        message = self._build_message(matches, len(created), skipped, filled_fields)
        logger.info(
            "graph8_lead_enriched",
            lead_id=lead.id,
            matches=matches,
            created=len(created),
            skipped=skipped,
            company_fields=filled_fields,
        )

        return PersonEnrichmentResult(
            matches_found=matches,
            contacts_created=len(created),
            contacts_skipped=skipped,
            company_enriched=company is not None,
            company_fields_filled=filled_fields,
            contacts=created,
            message=message,
        )

    async def _enrich_company(
        self,
        lead: Lead,
        domain: str | None,
        company_name: str | None,
    ) -> tuple[CompanyRecord | None, list[str]]:
        if not domain and not company_name:
            return None, []

        try:
            record = await self.provider.search_company(domain=domain, name=company_name)
        except Exception as e:  # company enrichment must never break contact enrichment
            logger.warning("graph8_company_lookup_failed", lead_id=lead.id, error=str(e))
            return None, []

        if not record:
            return None, []

        filled: list[str] = []
        for record_attr, lead_attr in COMPANY_FIELD_MAP.items():
            if getattr(lead, lead_attr, None) not in (None, ""):
                continue
            value = getattr(record, record_attr, None)
            if value in (None, ""):
                continue
            setattr(lead, lead_attr, value)
            filled.append(lead_attr)

        return record, filled

    @staticmethod
    def _preference(person: PersonRecord) -> tuple[int, float]:
        """Rank duplicate copies of the same person: more fields filled wins."""
        filled = sum(
            1
            for value in (
                person.email,
                person.phone,
                person.job_title,
                person.linkedin_url,
                person.full_name,
            )
            if value
        )
        return filled, person.confidence

    @staticmethod
    def _build_message(
        matches: int, created: int, skipped: int, filled_fields: list[str]
    ) -> str:
        if matches == 0 and not filled_fields:
            return (
                "No matching people found in graph8 for this company. "
                "Try again later or add contacts manually."
            )
        parts = []
        if created:
            parts.append(f"{created} new contact(s) added")
        elif matches:
            parts.append(f"{matches} match(es) found, all already saved")
        if skipped and created:
            parts.append(f"{skipped} skipped as duplicates")
        if filled_fields:
            parts.append(f"company data filled ({', '.join(filled_fields)})")
        return "; ".join(parts).capitalize() + "." if parts else "Nothing new to add."
