"""
Data pipeline step 1: Scrape horror film data using Firecrawl.
Run locally: python scripts/scrape_films.py
Output: data/raw_films.json
"""
import json
import os
import time
from pathlib import Path
from firecrawl import FirecrawlApp
from dotenv import load_dotenv

load_dotenv()

app = FirecrawlApp(api_key=os.environ["FIRECRAWL_API_KEY"])

# Prompt guides Firecrawl's LLM extractor — schema alone is not enough
EXTRACT_PROMPT = (
    "Extract information about a horror film from this page. "
    "Only extract data if this page is clearly about a specific horror movie "
    "(including subgenres: slasher, psychological horror, supernatural, found footage, "
    "body horror, folk horror, creature feature, gothic horror, zombie, etc.). "
    "If the page is NOT about a horror film, return is_horror=false and leave other fields empty. "
    "For synopsis, write 2-4 sentences describing the plot and tone. "
    "For genres, include both the broad genre (Horror) and any subgenres present."
)

FILM_SCHEMA = {
    "type": "object",
    "properties": {
        "is_horror": {
            "type": "boolean",
            "description": "True only if this is a horror film or horror subgenre film",
        },
        "title": {"type": "string"},
        "year": {"type": "number"},
        "director": {"type": "string"},
        "cast": {"type": "array", "items": {"type": "string"}},
        "genres": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Must include 'Horror' plus any subgenres (e.g. Slasher, Supernatural, Folk Horror)",
        },
        "themes": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Thematic elements: grief, isolation, paranoia, cults, survival, etc.",
        },
        "synopsis": {
            "type": "string",
            "description": "2-4 sentence plot + tone description",
        },
        "atmosphere": {
            "type": "string",
            "description": "One phrase describing the feel: e.g. 'slow burn dread', 'campy fun', 'relentless gore'",
        },
        "imdb_rating": {"type": "number"},
        "runtime_minutes": {"type": "number"},
        "streaming_platforms": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["is_horror", "title", "synopsis", "genres"],
}

SOURCES = [
    # Horror-specific review sites — highest signal
    {"url": "https://bloody-disgusting.com/reviews/", "type": "crawl", "limit": 200},
    {"url": "https://www.dreadcentral.com/reviews/", "type": "crawl", "limit": 100},
    # Wikipedia horror film lists — good for breadth
    {"url": "https://en.wikipedia.org/wiki/List_of_horror_films_of_the_2020s", "type": "scrape"},
    {"url": "https://en.wikipedia.org/wiki/List_of_horror_films_of_the_2010s", "type": "scrape"},
    {"url": "https://en.wikipedia.org/wiki/List_of_horror_films_of_the_2000s", "type": "scrape"},
    {"url": "https://en.wikipedia.org/wiki/List_of_horror_films_of_the_1990s", "type": "scrape"},
    {"url": "https://en.wikipedia.org/wiki/List_of_horror_films_of_the_1980s", "type": "scrape"},
]

REJECT_REASONS = {
    "not_horror": "is_horror is false or missing",
    "no_title": "missing title",
    "no_synopsis": "missing or too-short synopsis",
    "no_genres": "missing genres",
    "genres_no_horror": "genres present but Horror not listed",
}


def validate_film(film: dict) -> tuple[bool, str]:
    """Returns (is_valid, reject_reason)."""
    if not film.get("is_horror"):
        return False, REJECT_REASONS["not_horror"]
    if not film.get("title", "").strip():
        return False, REJECT_REASONS["no_title"]
    synopsis = film.get("synopsis", "")
    if not synopsis or len(synopsis.strip()) < 30:
        return False, REJECT_REASONS["no_synopsis"]
    genres = film.get("genres", [])
    if not genres:
        return False, REJECT_REASONS["no_genres"]
    if not any("horror" in g.lower() for g in genres):
        return False, REJECT_REASONS["genres_no_horror"]
    return True, ""


def scrape_source(source: dict) -> tuple[list[dict], dict]:
    results = []
    rejected = {"not_horror": 0, "no_title": 0, "no_synopsis": 0, "no_genres": 0, "genres_no_horror": 0}

    def process_extract(raw):
        items = raw if isinstance(raw, list) else [raw]
        for item in items:
            if not isinstance(item, dict):
                continue
            valid, reason = validate_film(item)
            if valid:
                results.append(item)
            elif reason:
                key = next((k for k, v in REJECT_REASONS.items() if v == reason), None)
                if key:
                    rejected[key] += 1

    extract_options = {"prompt": EXTRACT_PROMPT, "schema": FILM_SCHEMA}

    if source["type"] == "scrape":
        print(f"Scraping: {source['url']}")
        result = app.scrape_url(source["url"], formats=["extract"], extract=extract_options)
        if result.get("extract"):
            process_extract(result["extract"])

    elif source["type"] == "crawl":
        print(f"Crawling: {source['url']} (limit={source['limit']})")
        crawl = app.crawl_url(
            source["url"],
            limit=source["limit"],
            scrape_options={"formats": ["extract"], "extract": extract_options},
        )
        for page in crawl.get("data", []):
            if page.get("extract"):
                process_extract(page["extract"])

    return results, rejected


def deduplicate(films: list[dict]) -> list[dict]:
    seen = set()
    unique = []
    for f in films:
        key = (f.get("title", "").lower().strip(), f.get("year"))
        if key not in seen:
            seen.add(key)
            unique.append(f)
    return unique


def main():
    Path("data").mkdir(exist_ok=True)
    all_films = []
    total_rejected = {k: 0 for k in REJECT_REASONS}

    for source in SOURCES:
        try:
            films, rejected = scrape_source(source)
            for k, v in rejected.items():
                total_rejected[k] += v
            print(f"  → {len(films)} horror films kept | rejected: {dict((k, v) for k, v in rejected.items() if v)}")
            all_films.extend(films)
            time.sleep(1)
        except Exception as e:
            print(f"  ERROR: {e}")

    unique_films = deduplicate(all_films)

    print(f"\n{'='*50}")
    print(f"Total unique horror films: {len(unique_films)}")
    print("Rejection breakdown:")
    for reason, count in total_rejected.items():
        if count:
            print(f"  {reason}: {count}")

    # Spot-check: print first 3 to verify quality
    print("\nSample (first 3 films):")
    for f in unique_films[:3]:
        print(f"  - {f['title']} ({f.get('year')}) | genres: {f.get('genres')} | synopsis: {f.get('synopsis', '')[:80]}...")

    with open("data/raw_films.json", "w") as f:
        json.dump(unique_films, f, indent=2)

    print(f"\nSaved to data/raw_films.json")


if __name__ == "__main__":
    main()
