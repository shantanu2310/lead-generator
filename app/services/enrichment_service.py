from app.core.logging import get_logger
from app.models.evidence import Evidence, EvidenceCollection
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
