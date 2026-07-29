from pydantic import BaseModel, Field


class RelevanceResult(BaseModel):
    matches_intent: bool = Field(
        ..., description="Whether the business matches the search intent"
    )
    relevance_score: int = Field(
        ..., ge=0, le=100, description="Relevance score from 0-100"
    )
    reason: str = Field(
        ..., description="Brief explanation of relevance classification"
    )


RELEVANCE_PROMPT = """You are a relevance classifier for a lead generation system.

Given a business and a user's search intent, classify whether this business is relevant.

Rules:
- Return matches_intent: true if the business genuinely provides the requested service
- Return a relevance_score from 0-100
- Provide a brief reason for the classification
- Be strict: only mark as relevant if the business clearly matches the intent
- Consider: business name, category, description, services offered

Examples of relevant matches:
- Query "florist", Business: "Bloom Flower Shop" → matches_intent: true, score: 95
- Query "dentist", Business: "City Dental Clinic" → matches_intent: true, score: 98

Examples of irrelevant matches:
- Query "florist", Business: "Green Garden Tools" → matches_intent: false, score: 15
- Query "dentist", Business: "Health Food Store" → matches_intent: false, score: 10
"""
