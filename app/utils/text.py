import unicodedata


def normalize_text(text: str) -> str:
    if not text:
        return ""
    text = unicodedata.normalize("NFKD", text)
    text = text.encode("ascii", "ignore").decode("ascii")
    text = text.lower().strip()
    text = " ".join(text.split())
    return text


def normalize_company_name(name: str) -> str:
    if not name:
        return ""
    name = normalize_text(name)
    suffixes = [
        "b.v.", "bv", "n.v.", "nv", "ltd", "limited", "inc", "incorporated",
        "corp", "corporation", "llc", "l.l.c.", "gmbh", "co", "company",
        "spa", "s.a.", "sa", "pty ltd", "ltda",
    ]
    for suffix in suffixes:
        if name.endswith(" " + suffix):
            name = name[: -len(suffix) - 1].strip()
    return name
