import asyncio
import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.config import settings


async def test_openai():
    print("\n=== Testing OpenAI API ===")
    print(f"API Key: {settings.llm_api_key[:10]}...")
    print(f"Model: {settings.llm_model}")
    
    from app.providers.openai.client import get_llm_client
    client = get_llm_client()
    
    try:
        messages = [
            {"role": "system", "content": "You are a helpful assistant. Reply with one word."},
            {"role": "user", "content": "What is 2+2?"},
        ]
        response = await client.complete(messages, max_tokens=10)
        print(f"OpenAI response: {response}")
        return True
    except Exception as e:
        print(f"OpenAI error: {e}")
        return False


async def test_intent():
    print("\n=== Testing Intent Parsing ===")
    from app.providers.openai.client import get_llm_client
    from app.services.intent_service import IntentService
    
    llm = get_llm_client()
    intent_service = IntentService(llm)
    
    try:
        intent = await intent_service.parse_intent("plumbers in Austin Texas")
        print(f"Entity type: {intent.entity_type}")
        print(f"Category: {intent.category}")
        print(f"Location: {intent.location}")
        print(f"Location mode: {intent.location_mode}")
        
        plan = await intent_service.plan_search(intent)
        print(f"Primary source: {plan.primary_source}")
        print(f"Search queries: {plan.search_queries}")
        print(f"Requires website: {plan.requires_website_analysis}")
        print(f"Requires email: {plan.requires_email_enrichment}")
        return True
    except Exception as e:
        print(f"Intent error: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_google_places():
    print("\n=== Testing Google Places ===")
    from app.providers.google_places.client import GooglePlacesClient
    
    client = GooglePlacesClient()
    
    try:
        results = await client.text_search(
            query="plumbers in Austin Texas",
            max_results=5,
        )
        print(f"Found {len(results)} results")
        for r in results[:3]:
            name = r.get("displayName", {}).get("text", "N/A")
            print(f"  - {name}")
        await client.close()
        return len(results) > 0
    except Exception as e:
        print(f"Google Places error: {e}")
        import traceback
        traceback.print_exc()
        await client.close()
        return False


async def test_full_pipeline():
    print("\n=== Testing Full Pipeline ===")
    from app.dependencies import get_orchestrator
    
    orchestrator = get_orchestrator()
    
    try:
        result = await orchestrator.run(
            query="plumbers in Austin Texas",
            max_leads=5,
        )
        print(f"Candidates checked: {result.candidates_checked}")
        print(f"Qualified leads: {result.qualified_leads_found}")
        print(f"Leads returned: {len(result.leads)}")
        
        for i, lead in enumerate(result.leads):
            print(f"\n--- Lead {i+1} ---")
            print(f"  Business: {lead.business_name}")
            print(f"  Website: {lead.website}")
            print(f"  Email: {lead.email}")
            print(f"  Phone: {lead.phone}")
            print(f"  Address: {lead.address}")
            print(f"  Score: {lead.confidence_score}")
            print(f"  Verification: {lead.verification}")
        
        return len(result.leads) > 0
    except Exception as e:
        print(f"Pipeline error: {e}")
        import traceback
        traceback.print_exc()
        return False


async def main():
    print("=" * 60)
    print("LEAD GENERATOR - END-TO-END TEST")
    print("=" * 60)
    
    results = {}
    
    results["openai"] = await test_openai()
    results["intent"] = await test_intent()
    results["google_places"] = await test_google_places()
    results["pipeline"] = await test_full_pipeline()
    
    print("\n" + "=" * 60)
    print("RESULTS SUMMARY")
    print("=" * 60)
    for name, passed in results.items():
        status = "PASS" if passed else "FAIL"
        print(f"  {name}: {status}")
    
    all_passed = all(results.values())
    print(f"\nOverall: {'ALL PASSED' if all_passed else 'SOME FAILED'}")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
