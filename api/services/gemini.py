from google import genai
from functools import lru_cache
from pydantic_settings import BaseSettings
import json
import os
import re


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
    similar_to: str | None = None,
) -> list[dict]:
    """Rerank candidates and generate match explanations using Gemini.

    If similar_to is provided, the prompt shifts to finding films with the same
    tone/atmosphere as that title rather than matching a freeform query.
    """
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
                "atmosphere": (c.get("atmosphere") or "")[:80],
            }
            for c in candidates
            if c.get("title")
        ],
        separators=(",", ":"),
    )

    if similar_to:
        prompt = f"""You are a horror film expert and curator with deep knowledge of international and obscure cinema.
The user wants films with the same tone, atmosphere, and sensibility as: "{similar_to}"{context_str}

Candidates: {candidates_json}

Rank by how closely they share the *feel* of "{similar_to}" — not just genre overlap, but mood, pacing, and dread quality.
Strongly prefer obscure and under-seen titles. Avoid mainstream picks unless they are genuinely the closest match.

Return JSON array of top 8, best match first. Each item: {{"id":"...","rank":1,"why":"one sentence on the specific atmospheric similarity","score":0.9}}
Return ONLY valid JSON, no markdown."""
    else:
        prompt = f"""You are a horror film expert and curator with deep knowledge of international and obscure cinema.
Query: "{query}"{context_str}

Candidates: {candidates_json}

Rank the best matches. When films are equally relevant, STRONGLY prefer the more obscure and under-seen titles.
Avoid defaulting to well-known mainstream picks unless they are clearly the best possible fit.

Return JSON array of top 8, best match first. Each item: {{"id":"...","rank":1,"why":"one sentence why this film fits — mention what makes it distinctive","score":0.9}}
Return ONLY valid JSON, no markdown."""

    try:
        text = _generate(prompt).strip()
        # Strip markdown code fences Gemini sometimes adds
        if text.startswith("```"):
            text = re.sub(r"^```(?:json)?\s*", "", text)
            text = re.sub(r"\s*```$", "", text)
        rankings = json.loads(text.strip())
        if isinstance(rankings, dict):
            rankings = next(iter(rankings.values()))
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


def expand_search_query(q: str) -> str:
    """Rewrite any query into an atmospheric description for vibe-based retrieval."""
    prompt = f"""You are a horror film expert. A user searched for: "{q}"

This could be a film title, director name, subgenre, theme, era, or vibe description.
Rewrite it as a 1-2 sentence atmospheric description capturing MOOD, TONE, DREAD QUALITY, and AESTHETIC.

IMPORTANT: If the query mentions a specific decade or era (70s, 1980s, etc.) you MUST preserve
that temporal context explicitly in your rewrite (e.g. "1970s", "made in the eighties").

Do NOT mention specific film titles. Return ONLY the rewritten description."""
    return _generate(prompt).strip()


def image_to_horror_query(image_bytes: bytes, mime_type: str) -> str:
    """Use Gemini Vision to turn an image into a horror-film atmosphere search query."""
    from google.genai import types

    response = _get_client().models.generate_content(
        model="gemini-2.5-flash",
        contents=[
            types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
            """You are an expert horror film curator with deep knowledge of atmosphere and aesthetics.
Analyse this image and describe what kind of horror film it evokes — focus on:
colour palette and lighting, physical setting and time period, emotional tone and dread quality,
visual texture (grainy, clinical, lush, stark), and any specific horror subgenres or directors it brings to mind.

Return ONLY a 2-sentence search query a film database could use to find horror movies that feel like this image.
No preamble, no explanation — just the query.""",
        ],
    )
    return response.text.strip()
