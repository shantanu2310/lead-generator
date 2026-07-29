import re
from urllib.parse import urlparse


def normalize_domain(url: str) -> str:
    if not url:
        return ""
    url = url.strip()
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    parsed = urlparse(url)
    domain = parsed.hostname or ""
    domain = domain.lower()
    domain = re.sub(r"^www\.", "", domain)
    return domain


def extract_domain_from_email(email: str) -> str:
    if not email or "@" not in email:
        return ""
    return email.split("@")[-1].lower().strip()
