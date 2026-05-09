from google import genai
from functools import lru_cache
from pydantic_settings import BaseSettings
import json
import os


class Settings(BaseSettings):
    gemini_api_key: str

    model_config = {"env_file": ".env", "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    return Settings()


@lru_cache(maxsize=1)
def _get_client() -> genai.Client:
    return genai.Client(api_key=get_settings().gemini_api_key)


def _generate(prompt: str) -> str:
    response = _get_client().models.generate_content(
        model="gemini-2.5-flash-lite",
        contents=prompt,
    )
    return response.text


def rerank_and_explain(
    query: str,
    candidates: list[dict],
    user_context: dict | None = None,
) -> list[dict]:
    """Rerank candidates and generate match explanations using Gemini."""
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

    try:
        text = _generate(prompt)
        rankings = json.loads(text)
    except Exception:
        return candidates[:8]

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
    prompt = f"""Convert this horror movie mood into a concise search query (one line) capturing themes, tone, subgenres, atmosphere.
Mood: "{mood_input}"
Return only the query string."""
    return _generate(prompt).strip()
