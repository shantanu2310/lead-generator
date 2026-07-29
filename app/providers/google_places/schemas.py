from pydantic import BaseModel


class GooglePlacesSearchResult(BaseModel):
    places: list[dict] = []
    total_results: int = 0
    status: str = "ok"
