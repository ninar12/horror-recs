import google.generativeai as genai
from google.generativeai import GenerativeModel
from pydantic_settings import BaseSettings
from functools import lru_cache
import json


class Settings(BaseSettings):
    gemini_api_key: str

    model_config = {"env_file": ".env", "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    return Settings()


def init_gemini() -> None:
    genai.configure(api_key=get_settings().gemini_api_key)



def _make_model() -> GenerativeModel:
    return GenerativeModel("gemini-2.5-flash-lite")


def rerank_and_explain(
    query: str,
    candidates: list[dict],
    user_context: dict | None = None,
) -> list[dict]:
    """Rerank candidates and generate match explanations using Gemini Flash."""
    init_gemini()
    model = _make_model()

    context_str = ""
    if user_context:
        watched = user_context.get("watched_titles", [])
        if watched:
            context_str = f"\nUser has watched: {', '.join(watched[:10])}"

    candidates_json = json.dumps(
        [
            {
                "id": c.get("id", ""),
                "title": c.get("title", ""),
                "genres": c.get("genres", []),
                "niche_score": c.get("niche_score", 5),
                "synopsis": (c.get("synopsis") or "")[:120],
            }
            for c in candidates
            if c.get("title")
        ],
        separators=(",", ":"),
    )

    prompt = f"""Horror film expert. Query: "{query}"{context_str}

Candidates: {candidates_json}

Return JSON array of top 8, best match first. Each item: {{"id":"...","rank":1,"why":"one sentence why it fits","score":0.9}}
Only valid JSON, no markdown."""

    response = model.generate_content(prompt)
    try:
        rankings = json.loads(response.text)
    except json.JSONDecodeError:
        return candidates[:10]

    rank_map = {r["id"]: r for r in rankings}
    results = []
    for c in candidates:
        if c["id"] in rank_map:
            r = rank_map[c["id"]]
            results.append({
                **c,
                "rank": r.get("rank", 99),
                "why_youll_like_it": r.get("why") or r.get("why_youll_like_it", ""),
                "match_score": r.get("score") or r.get("match_score", 0.0),
            })

    return sorted(results, key=lambda x: x.get("rank", 99))


def generate_mood_query(mood_input: str) -> str:
    """Expand a freeform mood description into a rich search query."""
    init_gemini()
    model = _make_model()
    prompt = f"""Convert this horror movie mood into a concise search query (one line) capturing themes, tone, subgenres, atmosphere.
Mood: "{mood_input}"
Return only the query string."""
    response = model.generate_content(prompt)
    return response.text.strip()
