import phonenumbers


def normalize_phone(phone: str, default_country: str = "US") -> str | None:
    if not phone:
        return None
    try:
        parsed = phonenumbers.parse(phone, default_country)
        if phonenumbers.is_valid_number(parsed):
            return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
        if phonenumbers.is_possible_number(parsed):
            return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
    except phonenumbers.NumberParseException:
        pass
    return None


def validate_phone(phone: str, default_country: str = "US") -> dict:
    result = {
        "is_possible": False,
        "is_valid": False,
        "normalized": None,
        "country_code": None,
    }
    if not phone:
        return result
    try:
        parsed = phonenumbers.parse(phone, default_country)
        result["is_possible"] = phonenumbers.is_possible_number(parsed)
        result["is_valid"] = phonenumbers.is_valid_number(parsed)
        result["country_code"] = parsed.country_code
        result["normalized"] = phonenumbers.format_number(
            parsed, phonenumbers.PhoneNumberFormat.E164
        )
    except phonenumbers.NumberParseException:
        pass
    return result


def phones_match(phone1: str, phone2: str) -> bool:
    norm1 = normalize_phone(phone1)
    norm2 = normalize_phone(phone2)
    if not norm1 or not norm2:
        return False
    return norm1 == norm2
