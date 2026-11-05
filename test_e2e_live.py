"""Live verification: raw Google Places queries + full pipeline both modes."""

import asyncio
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.config import settings

RAW_QUERIES = [
    "florist in Amsterdam",
    "dentist in Amsterdam",
    "plumber in Amsterdam",
    "HR consultancy in Amsterdam",
    "HR managers in Amsterdam",  # the query that used to return nothing
]


async def test_raw_places() -> bool:
    print("\n=== RAW: Google Places text_search (canonical queries) ===")
    from app.providers.google_places.client import GooglePlacesClient

    if not settings.google_places_api_key:
        print("  SKIP: no GOOGLE_PLACES_API_KEY")
        return True

    client = GooglePlacesClient()
    ok = True
    try:
        for query in RAW_QUERIES:
            t0 = time.time()
            places = await client.text_search(query, max_results=20)
            dt = time.time() - t0
            sample = places[0].get("displayName", {}).get("text", "?") if places else "-"
            primary = places[0].get("primaryType", "?") if places else "-"
            print(f"  {query!r}: {len(places)} places ({dt:.1f}s) "
                  f"| first={sample!r} primaryType={primary!r}")
            if query != "HR managers in Amsterdam":
                if len(places) < 5:
                    ok = False
                    print(f"    FAIL: expected >= 5 places for a normal business query")
            if places:
                p = places[0]
                print(f"    category check: types={p.get('types', [])[:3]} "
                      f"primaryType={p.get('primaryType')}")
    finally:
        await client.close()
    print("  PASS" if ok else "  FAIL")
    return ok


async def test_pipeline(mode: str, query: str) -> bool:
    print(f"\n=== PIPELINE e2e: mode={mode!r} query={query!r} ===")
    from app.dependencies import get_orchestrator

    orchestrator = get_orchestrator()
    t0 = time.time()
    try:
        result = await orchestrator.run(query=query, max_leads=5, mode=mode)
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"  FAIL: {e}")
        return False
    dt = time.time() - t0

    print(f"  candidates={result.candidates_checked} "
          f"qualified={result.qualified_leads_found} leads={len(result.leads)} ({dt:.0f}s)")
    ok = True
    if not result.leads:
        print("  FAIL: 0 leads")
        ok = False
    for lead in result.leads:
        print(f"    - {lead.business_name} | {lead.website} | score={lead.confidence_score} "
              f"| reason={lead.relevance_reason}")
        if lead.contact:
            c = lead.contact
            print(f"        contact: {c.full_name} | {c.job_title} | {c.linkedin_url}")

    if mode == "person":
        with_contact = [l for l in result.leads if l.contact and l.contact.linkedin_url]
        print(f"  leads with LinkedIn contact: {len(with_contact)}/{len(result.leads)}")
        if not with_contact:
            print("  FAIL: person mode produced no LinkedIn contacts")
            ok = False
    print("  PASS" if ok else "  FAIL")
    return ok


async def main():
    print("=" * 60)
    print("LIVE E2E VERIFICATION")
    print("=" * 60)
    print(f"llm={'SET' if settings.llm_api_key else 'MISSING'} "
          f"places={'SET' if settings.google_places_api_key else 'MISSING'} "
          f"graph8={'SET' if settings.graph8_api_key else 'MISSING'}")

    results = {}
    results["raw_places"] = await test_raw_places()
    results["company_mode"] = await test_pipeline("company", "florists in Amsterdam")
    results["person_mode"] = await test_pipeline("person", "HR managers in Amsterdam")

    print("\n" + "=" * 60)
    for name, passed in results.items():
        print(f"  {name}: {'PASS' if passed else 'FAIL'}")
    all_passed = all(results.values())
    print(f"\nOverall: {'ALL PASSED' if all_passed else 'SOME FAILED'}")
    print("=" * 60)
    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
