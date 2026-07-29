import re
from urllib.parse import urljoin

import httpx

from app.core.logging import get_logger
from app.providers.base.crawler_provider import CrawledPage, CrawlerProvider

logger = get_logger()

EMAIL_REGEX = re.compile(
    r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", re.IGNORECASE
)
PHONE_REGEX = re.compile(
    r"(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}"
)


def _extract_emails(text: str) -> list[str]:
    return list(set(EMAIL_REGEX.findall(text)))


def _extract_phones(text: str) -> list[str]:
    raw = PHONE_REGEX.findall(text)
    cleaned = []
    for phone in raw:
        phone = phone.strip()
        if len(phone) >= 8:
            cleaned.append(phone)
    return list(set(cleaned))


def _extract_json_ld(html: str) -> list[dict]:
    import json

    results = []
    pattern = re.compile(
        r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
        re.DOTALL | re.IGNORECASE,
    )
    for match in pattern.finditer(html):
        try:
            data = json.loads(match.group(1))
            if isinstance(data, list):
                results.extend(data)
            else:
                results.append(data)
        except (json.JSONDecodeError, TypeError):
            continue
    return results


def _extract_meta_tags(html: str) -> dict[str, str]:
    tags = {}
    pattern = re.compile(
        r'<meta[^>]+(?:name|property)=["\']([^"\']+)["\'][^>]+content=["\']([^"\']+)["\']',
        re.IGNORECASE,
    )
    for match in pattern.finditer(html):
        tags[match.group(1).lower()] = match.group(2)
    return tags


def _extract_title(html: str) -> str | None:
    match = re.search(r"<title[^>]*>(.*?)</title>", html, re.DOTALL | re.IGNORECASE)
    if match:
        return match.group(1).strip()
    return None


def _extract_text_from_html(html: str) -> str:
    text = re.sub(r"<script[^>]*>.*?</script>", "", html, flags=re.DOTALL)
    text = re.sub(r"<style[^>]*>.*?</style>", "", text, flags=re.DOTALL)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


class Crawl4AIProvider(CrawlerProvider):
    def __init__(self) -> None:
        self.client = httpx.AsyncClient(
            timeout=30.0,
            follow_redirects=True,
            headers={
                "User-Agent": (
                    "Mozilla/5.0 (compatible; LeadGenBot/1.0; "
                    "+https://github.com/leadgen)"
                )
            },
        )

    async def close(self) -> None:
        await self.client.aclose()

    async def crawl_page(self, url: str) -> CrawledPage:
        try:
            response = await self.client.get(url)
            response.raise_for_status()

            content_type = response.headers.get("content-type", "")
            if "text/html" not in content_type and "application/xhtml" not in content_type:
                return CrawledPage(
                    url=url,
                    status_code=response.status_code,
                    content_type=content_type,
                    error="Not an HTML page",
                )

            html = response.text
            text_content = _extract_text_from_html(html)
            title = _extract_title(html)
            json_ld = _extract_json_ld(html)
            meta_tags = _extract_meta_tags(html)
            emails = _extract_emails(text_content)
            phones = _extract_phones(text_content)

            links = []
            link_pattern = re.compile(r'href=["\']([^"\']+)["\']', re.IGNORECASE)
            base_url = str(response.url)
            for match in link_pattern.finditer(html):
                href = match.group(1)
                if href.startswith(("http://", "https://")):
                    links.append(href)
                elif href.startswith("/"):
                    links.append(urljoin(base_url, href))

            return CrawledPage(
                url=url,
                status_code=response.status_code,
                content_type=content_type,
                title=title,
                html=html,
                text_content=text_content,
                links=links,
                emails=emails,
                phones=phones,
                json_ld=json_ld,
                meta_tags=meta_tags,
            )

        except httpx.HTTPStatusError as e:
            logger.warning("crawl4ai_http_error", url=url, status=e.response.status_code)
            return CrawledPage(
                url=url,
                status_code=e.response.status_code,
                error=f"HTTP {e.response.status_code}",
            )
        except httpx.RequestError as e:
            logger.warning("crawl4ai_request_error", url=url, error=str(e))
            return CrawledPage(url=url, status_code=0, error=str(e))
        except Exception as e:
            logger.warning("crawl4ai_error", url=url, error=str(e))
            return CrawledPage(url=url, status_code=0, error=str(e))
