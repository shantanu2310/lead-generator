import re


def normalize_email(email: str) -> str:
    if not email:
        return ""
    return email.lower().strip()


def is_business_email(email: str, domain: str) -> bool:
    if not email or not domain:
        return False
    free_providers = {
        "gmail.com", "yahoo.com", "outlook.com", "hotmail.com",
        "aol.com", "icloud.com", "mail.com", "protonmail.com",
    }
    email_domain = email.split("@")[-1].lower()
    return email_domain == domain.lower() and email_domain not in free_providers


def is_valid_email_format(email: str) -> bool:
    pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    return bool(re.match(pattern, email))
