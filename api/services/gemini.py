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



def rerank_and_explain(
    query: str,
    candidates: list[dict],
    user_context: dict | None = None,
) -> list[dict]:
    """
    Use Gemini Flash to rerank candidates and generate match explanations.
    Returns candidates sorted by relevance with 'why_youll_like_it' added.
    """
    init_gemini()
    model = GenerativeModel("gemini-2.5-flash")

    context_str = ""
    if user_context:
        watched = user_context.get("watched_titles", [])
        liked = user_context.get("liked_subgenres", [])
        if watched:
            context_str = f"\nUser has watched: {', '.join(watched[:10])}"
        if liked:
            context_str += f"\nUser tends to enjoy: {', '.join(liked)}"

    candidates_json = json.dumps(
        [
            {
                "id": c.get("id", ""),
                "title": c.get("title", ""),
                "synopsis": c.get("synopsis", ""),
                "genres": c.get("genres", []),
                "keywords": c.get("keywords", []),
                "niche_score": c.get("niche_score", 5),
            }
            for c in candidates
            if c.get("title")
        ],
        indent=2,
    )

    prompt = f"""You are a horror film expert who champions obscure and niche cinema. A user searched for: "{query}"{context_str}

Here are candidate films (JSON):
{candidates_json}

Return a JSON array of the top 10 matches, ordered by relevance. Prioritize niche, obscure, and cult films (higher niche_score) when relevance is similar — surface hidden gems over mainstream picks the user has likely already heard of.

For each film include:
- "id": the film id
- "rank": 1-10
- "why_youll_like_it": 1-2 sentences explaining specifically why this matches the query (reference themes/tone/style, and if it's a hidden gem say so)
- "match_score": 0.0-1.0

Only return valid JSON, no markdown fences."""

    response = model.generate_content(prompt)
    try:
        rankings = json.loads(response.text)
    except json.JSONDecodeError:
        # fallback: return candidates as-is if parse fails
        return candidates[:10]

    rank_map = {r["id"]: r for r in rankings}
    results = []
    for c in candidates:
        if c["id"] in rank_map:
            results.append({**c, **rank_map[c["id"]]})

    return sorted(results, key=lambda x: x.get("rank", 99))


def generate_mood_query(mood_input: str) -> str:
    """Expand a freeform mood description into a rich search query."""
    init_gemini()
    model = GenerativeModel("gemini-2.5-flash")
    prompt = f"""Convert this horror movie mood into a detailed search query that captures themes, tone, subgenres, and atmosphere.
Mood: "{mood_input}"
Return only the expanded query string, no explanation."""
    response = model.generate_content(prompt)
    return response.text.strip()
