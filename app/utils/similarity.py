from difflib import SequenceMatcher


def calculate_similarity(text1: str, text2: str) -> float:
    if not text1 or not text2:
        return 0.0
    return SequenceMatcher(None, text1.lower(), text2.lower()).ratio()


def is_possible_duplicate(
    name1: str,
    name2: str,
    address1: str | None = None,
    address2: str | None = None,
    name_threshold: float = 0.90,
    address_threshold: float = 0.85,
) -> bool:
    name_sim = calculate_similarity(name1, name2)
    if name_sim < name_threshold:
        return False
    if address1 and address2:
        addr_sim = calculate_similarity(address1, address2)
        return addr_sim >= address_threshold
    return name_sim >= name_threshold
