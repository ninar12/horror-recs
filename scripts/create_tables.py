"""
One-time setup: create all Neon (Postgres) tables.
Run once after adding DATABASE_URL to .env:
    python scripts/create_tables.py
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv()

from api.services.database import create_tables

create_tables()
print("Tables created: users, watchlists, watchlist_items, watch_history")
