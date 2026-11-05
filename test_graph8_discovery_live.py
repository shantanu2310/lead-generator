"""Live smoke test for the two graph8 discovery providers (real HTTP)."""

import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.providers.base.business_provider import SearchPlan
from app.providers.graph8.discovery import Graph8CompanyProvider, Graph8PeopleProvider


async def main():
    print("=" * 60)
    print("GRAPH8 DISCOVERY LIVE TESTS")
    print("=" * 60)
    ok = True

    # --- Company provider (Places-0 fallback path) ---
    print("\n=== LIVE: Graph8CompanyProvider (recruitment agency, Amsterdam) ===")
    company = Graph8CompanyProvider()
    try:
        plan = SearchPlan(
            primary_source="google_places",
            category="recruitment agency",
            location="Amsterdam",
            candidate_target=20,
        )
        candidates = await company.search(plan)
        print(f"  candidates: {len(candidates)}")
        for c in candidates[:5]:
            print(f"    - {c.name} | {c.website} | {c.category} | {c.business_status} | {c.source_url}")
        assert candidates, "expected companies from graph8"
        assert all(c.category == "recruitment agency" for c in candidates)
        assert all(c.source == "graph8_companies" for c in candidates)
        print("  PASS")
    except Exception as e:
        import traceback
        traceback.print_exc()
        ok = False
        print(f"  FAIL: {e}")
    finally:
        await company.close()

    # --- People provider (person-mode primary path) ---
    print("\n=== LIVE: Graph8PeopleProvider (HR Manager, Amsterdam) ===")
    people = Graph8PeopleProvider()
    try:
        plan = SearchPlan(
            primary_source="graph8_people",
            secondary_source="google_places",
            job_title="HR Manager",
            location="Amsterdam",
            candidate_target=20,
        )
        candidates = await people.search(plan)
        print(f"  company candidates: {len(candidates)}")
        for c in candidates[:5]:
            person = c.contact
            print(
                f"    - {c.name} | {c.website} | cat={c.category} | {c.business_status}"
            )
            if person:
                print(
                    f"        contact: {person.full_name} | {person.job_title} | "
                    f"{person.linkedin_url} | email={person.email}"
                )
        assert candidates, "expected people/companies from graph8"
        assert all(c.contact is not None for c in candidates), "every candidate needs a contact"
        assert all(c.category == "HR Manager" for c in candidates)
        assert all(c.source == "graph8_people" for c in candidates)
        locked = [
            c.contact.email
            for c in candidates
            if c.contact and c.contact.email not in (None, "") and c.contact.email != "***"
        ]
        print(f"  contacts with usable email: {len(locked)}")
        print("  PASS")
    except Exception as e:
        import traceback
        traceback.print_exc()
        ok = False
        print(f"  FAIL: {e}")
    finally:
        await people.close()

    print("\n" + "=" * 60)
    print(f"Overall: {'ALL PASSED' if ok else 'SOME FAILED'}")
    print("=" * 60)
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
