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


class PipelineStage(StrEnum):
    NEW_LEAD = "new_lead"
    QUALIFIED = "qualified"
    CONTACT_FOUND = "contact_found"
    VERIFIED = "verified"
    RESEARCH_COMPLETE = "research_complete"
    OUTREACH_READY = "outreach_ready"
    EMAIL_SENT = "email_sent"
    FOLLOW_UP = "follow_up"
    MEETING = "meeting"
    PROPOSAL = "proposal"
    NEGOTIATION = "negotiation"
    WON = "won"
    LOST = "lost"


class Priority(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class EmailStatus(StrEnum):
    PENDING = "pending"
    VERIFIED = "verified"
    INVALID = "invalid"
    BOUNCED = "bounced"
    OPENED = "opened"
    REPLIED = "replied"


class MeetingStatus(StrEnum):
    NONE = "none"
    SCHEDULED = "scheduled"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class ContactChannel(StrEnum):
    CALL = "call"
    EMAIL = "email"
    WHATSAPP = "whatsapp"
    MEETING = "meeting"
    OTHER = "other"


class ContactOutcome(StrEnum):
    NOT_REACHED = "not_reached"
    NO_ANSWER = "no_answer"
    LEFT_MESSAGE = "left_message"
    INTERESTED = "interested"
    NOT_INTERESTED = "not_interested"
    CALLBACK_REQUESTED = "callback_requested"
    MEETING_SCHEDULED = "meeting_scheduled"
    FOLLOW_UP_REQUIRED = "follow_up_required"


OUTCOME_TO_STAGE: dict[str, str] = {
    ContactOutcome.INTERESTED.value: PipelineStage.QUALIFIED.value,
    ContactOutcome.CALLBACK_REQUESTED.value: PipelineStage.FOLLOW_UP.value,
    ContactOutcome.FOLLOW_UP_REQUIRED.value: PipelineStage.FOLLOW_UP.value,
    ContactOutcome.MEETING_SCHEDULED.value: PipelineStage.MEETING.value,
    ContactOutcome.NOT_INTERESTED.value: PipelineStage.LOST.value,
}

CALL_ATTEMPT_OUTCOMES: set[str] = {
    ContactOutcome.NO_ANSWER.value,
    ContactOutcome.NOT_REACHED.value,
    ContactOutcome.LEFT_MESSAGE.value,
}


class TimelineEventType(StrEnum):
    COMPANY_FOUND = "company_found"
    WEBSITE_VERIFIED = "website_verified"
    EMAIL_VERIFIED = "email_verified"
    CONTACT_FOUND = "contact_found"
    AI_SUMMARY_GENERATED = "ai_summary_generated"
    COLD_EMAIL_CREATED = "cold_email_created"
    EMAIL_SENT = "email_sent"
    EMAIL_OPENED = "email_opened"
    REPLY_RECEIVED = "reply_received"
    MEETING_SCHEDULED = "meeting_scheduled"
    PROPOSAL_SENT = "proposal_sent"
    DEAL_WON = "deal_won"
    DEAL_LOST = "deal_lost"
    STAGE_CHANGED = "stage_changed"
    NOTE_ADDED = "note_added"
    LEAD_ASSIGNED = "lead_assigned"
    CONTACT_LOGGED = "contact_logged"


class NotificationType(StrEnum):
    NEW_LEAD = "new_lead"
    EMAIL_VERIFIED = "email_verified"
    HIGH_SCORE_LEAD = "high_score_lead"
    REPLY_RECEIVED = "reply_received"
    MEETING_SCHEDULED = "meeting_scheduled"
    PROPOSAL_ACCEPTED = "proposal_accepted"
    DEAL_WON = "deal_won"
    AI_INSIGHT = "ai_insight"
    LEAD_ASSIGNED = "lead_assigned"
