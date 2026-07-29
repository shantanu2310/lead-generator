from app.utils.domain import normalize_domain
from app.utils.email import normalize_email
from app.utils.phone import normalize_phone
from app.utils.similarity import calculate_similarity, is_possible_duplicate
from app.utils.text import normalize_company_name


class TestDomainNormalization:
    def test_normalize_https_url(self):
        assert normalize_domain("https://www.example.com/") == "example.com"

    def test_normalize_http_url(self):
        assert normalize_domain("http://example.com") == "example.com"

    def test_normalize_www_prefix(self):
        assert normalize_domain("www.example.com") == "example.com"

    def test_normalize_bare_domain(self):
        assert normalize_domain("example.com") == "example.com"

    def test_normalize_empty(self):
        assert normalize_domain("") == ""


class TestEmailNormalization:
    def test_lowercase(self):
        assert normalize_email("Test@Example.COM") == "test@example.com"

    def test_trim_whitespace(self):
        assert normalize_email("  test@example.com  ") == "test@example.com"


class TestPhoneNormalization:
    def test_valid_phone(self):
        result = normalize_phone("+31201234567")
        assert result == "+31201234567"

    def test_invalid_phone(self):
        result = normalize_phone("not-a-phone")
        assert result is None

    def test_empty_phone(self):
        result = normalize_phone("")
        assert result is None


class TestSimilarity:
    def test_identical(self):
        assert calculate_similarity("hello", "hello") == 1.0

    def test_different(self):
        assert calculate_similarity("hello", "world") < 0.5

    def test_empty(self):
        assert calculate_similarity("", "hello") == 0.0


class TestDuplicateDetection:
    def test_exact_match(self):
        assert is_possible_duplicate("Example Corp", "Example Corp") is True

    def test_similar_names(self):
        assert is_possible_duplicate("Example Corp.", "Example Corp") is True

    def test_different_names(self):
        assert is_possible_duplicate("Example Corp", "Different Company") is False


class TestCompanyNameNormalization:
    def test_remove_ltd(self):
        assert normalize_company_name("Example Ltd") == "example"

    def test_remove_bv(self):
        assert normalize_company_name("Example B.V.") == "example"

    def test_no_suffix(self):
        assert normalize_company_name("Example") == "example"
