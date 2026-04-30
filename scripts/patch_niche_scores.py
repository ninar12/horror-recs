"""One-time patch: recompute niche scores on existing raw_films.json"""
import json
from collections import Counter

with open("data/raw_films.json") as f:
    films = json.load(f)


_POPULARITY_THRESHOLDS = [0.684, 0.821, 0.951, 1.070, 1.208, 1.376, 1.612, 2.072, 3.351]


def compute_niche_score(popularity, vote_count, vote_average=0.0, year=None, original_language="en"):
    base = 10
    for threshold in _POPULARITY_THRESHOLDS:
        if popularity > threshold:
            base -= 1
        else:
            break

    if vote_average < 5.0 and vote_count < 1000:
        base = max(1, base - 2)
    elif vote_average >= 7.0 and base >= 6:
        base = min(10, base + 1)

    if year and year < 1980:
        base = min(10, base + 1)

    if original_language and original_language not in ("en", ""):
        base = min(10, base + 1)

    return base


for f in films:
    f["niche_score"] = compute_niche_score(
        f.get("popularity", 0.0),
        f.get("vote_count", 0),
        f.get("imdb_rating", 0.0),
        f.get("year"),
        f.get("original_language", "en"),
    )

with open("data/raw_films.json", "w") as f:
    json.dump(films, f, indent=2)

scores = Counter(f["niche_score"] for f in films)
print(f"Updated {len(films)} films")
print("Niche score breakdown:", dict(sorted(scores.items())))
