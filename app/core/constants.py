from enum import StrEnum


class EntityType(StrEnum):
    LOCAL_BUSINESS = "local_business"
    COMPANY = "company"
    PERSON = "person"


class LocationMode(StrEnum):
    EXPLICIT = "explicit"
    USER_LOCATION = "user_location"
    NONE = "none"


class BusinessStatus(StrEnum):
    ACTIVE = "active"
    CLOSED_TEMPORARILY = "closed_temporarily"
    CLOSED_PERMANENTLY = "closed_permanently"
    UNKNOWN = "unknown"


class VerificationStatus(StrEnum):
    VALID = "valid"
    INVALID = "invalid"
    RISKY = "risky"
    ACCEPT_ALL = "accept_all"
    UNKNOWN = "unknown"


class DataSource(StrEnum):
    GOOGLE_PLACES = "google_places"
    BRAVE_SEARCH = "brave_search"
    HUNTER = "hunter"
    OFFICIAL_WEBSITE = "official_website"
    MANUAL = "manual"


DEFAULT_CANDIDATE_TARGET = 50
MAX_CANDIDATE_TARGET = 60
MAX_LEADS = 15
MINIMUM_LEAD_SCORE = 45
MAX_WEBSITE_PAGES = 5
WEBSITE_CONCURRENCY = 5
PROVIDER_CONCURRENCY = 5
NAME_SIMILARITY_THRESHOLD = 0.90
ADDRESS_SIMILARITY_THRESHOLD = 0.85
