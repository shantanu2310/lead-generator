from app.core.logging import get_logger
from app.providers.base.crawler_provider import CrawledPage, CrawlerProvider

logger = get_logger()

_PLAYWRIGHT_AVAILABLE = False
try:
    from playwright.async_api import async_playwright

    _PLAYWRIGHT_AVAILABLE = True
except ImportError:
    pass


class PlaywrightProvider(CrawlerProvider):
    def __init__(self) -> None:
        self._playwright = None
        self._browser = None

    async def _ensure_browser(self):
        if not _PLAYWRIGHT_AVAILABLE:
            raise RuntimeError(
                "Playwright is not installed. "
                "Install with: pip install playwright && playwright install chromium"
            )
        if self._browser is None:
            self._playwright = await async_playwright().start()
            self._browser = await self._playwright.chromium.launch(headless=True)

    async def close(self) -> None:
        if self._browser:
            await self._browser.close()
        if self._playwright:
            await self._playwright.stop()

    async def crawl_page(self, url: str) -> CrawledPage:
        import re

        try:
            await self._ensure_browser()
            page = await self._browser.new_page()

            response = await page.goto(url, wait_until="domcontentloaded", timeout=30000)
            status_code = response.status if response else 0

            await page.wait_for_timeout(2000)

            html = await page.content()
            title = await page.title()

            text_content = await page.evaluate(
                """() => {
                    const scripts = document.querySelectorAll('script, style');
                    scripts.forEach(s => s.remove());
                    return document.body ? document.body.innerText : '';
                }"""
            )

            emails = list(set(re.findall(
                r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}",
                text_content,
                re.IGNORECASE,
            )))

            phones = list(set(re.findall(
                r"(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}",
                text_content,
            )))

            links = await page.evaluate(
                """() => Array.from(document.querySelectorAll('a[href]'))
                    .map(a => a.href)
                    .filter(h => h.startsWith('http'))"""
            )

            await page.close()

            return CrawledPage(
                url=url,
                status_code=status_code,
                title=title,
                html=html,
                text_content=text_content,
                links=links,
                emails=emails,
                phones=phones,
            )

        except Exception as e:
            logger.warning("playwright_crawl_error", url=url, error=str(e))
            return CrawledPage(url=url, status_code=0, error=str(e))
