"""Debug: print raw Pinecone search response to see actual structure."""
import os, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))
from dotenv import load_dotenv
load_dotenv()

from pinecone import Pinecone

pc = Pinecone(api_key=os.environ["PINECONE_API_KEY"])
index = pc.Index(os.environ.get("PINECONE_INDEX_NAME", "horror-films"))

results = index.search(
    namespace="__default__",
    query={"inputs": {"text": "slow burn folk horror"}, "top_k": 3},
    fields=["title", "year", "synopsis", "niche_score"],
)

print("Type:", type(results))
print("Raw:", results)
print()

# Try to navigate the structure
if hasattr(results, "result"):
    print("Has .result")
    r = results.result
    print("result type:", type(r))
    if hasattr(r, "hits"):
        print(f"hits count: {len(r.hits)}")
        if r.hits:
            h = r.hits[0]
            print("First hit type:", type(h))
            print("First hit:", h)
            print("First hit vars:", vars(h) if hasattr(h, "__dict__") else "no __dict__")
    else:
        print("No .hits on result")
else:
    print("No .result — dict response")
    print(results)
