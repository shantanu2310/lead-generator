from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.logging import get_logger
from app.models.evidence import Evidence, EvidenceCollection
from app.models.lead import Contact, Lead
from app.providers.base.crawler_provider import WebsiteData
from app.providers.base.email_provider import EmailDiscoveryProvider, EmailResult

logger = get_logger()


class EmailEnrichmentService:
    def __init__(self, providers: list[EmailDiscoveryProvider]) -> None:
        self.providers = providers

    async def discover_emails(
        self,
        domain: str,
        website_data: WebsiteData | None = None,
    ) -> tuple[list[EmailResult], EvidenceCollection]:
        results = []
        evidence = EvidenceCollection()

        if website_data and website_data.emails_found:
            for email in website_data.emails_found:
                results.append(EmailResult(
                    email=email,
                    status="valid",
                    confidence=0.85,
                    source="official_website",
                ))
                evidence.add(Evidence(
                    field_name="email",
                    value=email,
                    source="official_website",
                    source_url=website_data.homepage.url if website_data.homepage else None,
                    confidence=0.85,
                ))

            high_confidence = [r for r in results if r.confidence >= 0.8]
            if high_confidence:
                logger.info(
                    "email_found_on_website",
                    domain=domain,
                    count=len(high_confidence),
                )
                return results, evidence

        for provider in self.providers:
            try:
                provider_results = await provider.discover_emails(domain)
                for result in provider_results:
                    results.append(result)
                    evidence.add(Evidence(
                        field_name="email",
                        value=result.email,
                        source=result.source,
                        confidence=result.confidence,
                    ))

                verified = [r for r in provider_results if r.confidence >= 0.7]
                if verified:
                    logger.info(
                        "email_found_by_provider",
                        domain=domain,
                        provider=provider.__class__.__name__,
                        count=len(verified),
                    )
                    break

            except Exception as e:
                logger.warning(
                    "email_provider_failed",
                    provider=provider.__class__.__name__,
                    error=str(e),
                )
                continue

        return results, evidence

    async def close(self) -> None:
        for provider in self.providers:
            await provider.close()


def _normalized_name(name: str | None) -> str:
    return " ".join((name or "").lower().split())


async def apply_email_results(
    db: AsyncSession, lead: Lead, results: list[EmailResult]
) -> int:
    """Write discovered emails onto a lead: the lead's own email, matching
    contacts' emails, then new contacts for unknown people. Returns emails stored."""
    if not results:
        return 0

    contacts = list(
        (await db.execute(select(Contact).where(Contact.lead_id == lead.id)))
        .scalars()
        .all()
    )
    used: set[str] = set()
    if lead.email:
        used.add(lead.email.lower())
    for contact in contacts:
        if contact.email:
            used.add(contact.email.lower())

    # Best confidence first: the strongest email lands on the lead itself.
    ordered = sorted(results, key=lambda r: -r.confidence)
    added = 0

    if not lead.email:
        for result in ordered:
            if result.email.lower() not in used:
                lead.email = result.email
                used.add(result.email.lower())
                added += 1
                break

    # Hand each remaining email to the contact with the same person-name.
    unmatched: list[EmailResult] = []
    for result in ordered:
        if result.email.lower() in used:
            continue
        full_name = " ".join(
            p for p in (result.first_name, result.last_name) if p
        ).strip()
        if not full_name:
            unmatched.append(result)
            continue
        target = next(
            (
                c
                for c in contacts
                if _normalized_name(c.name) == _normalized_name(full_name)
            ),
            None,
        )
        if target is None:
            unmatched.append(result)
        elif not target.email:
            target.email = result.email
            used.add(result.email.lower())
            added += 1
        # Known person already has an email -> drop, never duplicate a person.

    # Create contacts for genuinely new people, capped like graph8 results.
    has_primary = any(c.is_primary for c in contacts)
    for result in unmatched:
        if len(contacts) >= settings.graph8_max_contacts:
            break
        if result.email.lower() in used:
            continue
        full_name = " ".join(
            p for p in (result.first_name, result.last_name) if p
        ).strip()
        if not full_name:
            continue
        contact = Contact(
            lead_id=lead.id,
            company_id=lead.company_id,
            name=full_name,
            job_title=result.position,
            email=result.email,
            is_primary=not has_primary,
        )
        if contact.is_primary:
            has_primary = True
        db.add(contact)
        contacts.append(contact)
        used.add(result.email.lower())
        added += 1

    await db.flush()
    if added:
        logger.info("email_results_applied", lead_id=lead.id, emails_added=added)
    return added
