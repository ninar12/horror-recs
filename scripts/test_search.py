"""Debug the full search pipeline end-to-end."""
import sys, os, json
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))
from dotenv import load_dotenv
load_dotenv()

from api.services.pinecone_client import search_films
from api.services.gemini import rerank_and_explain

q = "slow burn folk horror"

print("=== Step 1: Pinecone search ===")
candidates = search_films(q, top_k=10)
print(f"Candidates returned: {len(candidates)}")
for c in candidates[:3]:
    print(f"  id={c.get('id')} title={c.get('title')} score={c.get('score'):.3f}")

if not candidates:
    print("PROBLEM: Pinecone returned nothing")
    sys.exit(1)

print("\n=== Step 2: Gemini rerank ===")
ranked = rerank_and_explain(q, candidates, {})
print(f"Ranked results: {len(ranked)}")
for r in ranked[:3]:
    print(f"  rank={r.get('rank')} title={r.get('title')} why={r.get('why_youll_like_it','')[:60]}")
