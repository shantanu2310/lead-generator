class LeadGenError(Exception):
    """Base exception for lead generator application."""

    def __init__(self, message: str = "An error occurred", code: str = "INTERNAL_ERROR") -> None:
        self.message = message
        self.code = code
        super().__init__(self.message)


class IntentParsingError(LeadGenError):
    def __init__(self, message: str = "Failed to parse search intent") -> None:
        super().__init__(message=message, code="INTENT_PARSING_ERROR")


class LocationRequiredError(LeadGenError):
    def __init__(self) -> None:
        super().__init__(
            message="Your search uses 'near me'. Latitude and longitude are required.",
            code="LOCATION_REQUIRED",
        )


class ProviderAuthenticationError(LeadGenError):
    def __init__(self, provider: str) -> None:
        super().__init__(
            message=f"Authentication failed for provider: {provider}",
            code="PROVIDER_AUTH_ERROR",
        )


class ProviderRateLimitError(LeadGenError):
    def __init__(self, provider: str, retry_after: int | None = None) -> None:
        self.retry_after = retry_after
        super().__init__(
            message=f"Rate limit exceeded for provider: {provider}",
            code="PROVIDER_RATE_LIMIT",
        )


class ProviderUnavailableError(LeadGenError):
    def __init__(self, provider: str) -> None:
        super().__init__(
            message=f"Provider temporarily unavailable: {provider}",
            code="PROVIDER_UNAVAILABLE",
        )


class WebsiteCrawlError(LeadGenError):
    def __init__(self, url: str, reason: str = "Crawl failed") -> None:
        super().__init__(
            message=f"Failed to crawl {url}: {reason}",
            code="WEBSITE_CRAWL_ERROR",
        )


class VerificationError(LeadGenError):
    def __init__(self, message: str = "Verification failed") -> None:
        super().__init__(message=message, code="VERIFICATION_ERROR")


class PipelineError(LeadGenError):
    def __init__(self, stage: str, message: str = "Pipeline stage failed") -> None:
        self.stage = stage
        super().__init__(
            message=f"Pipeline error at {stage}: {message}",
            code="PIPELINE_ERROR",
        )
