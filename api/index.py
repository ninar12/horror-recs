from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum
from dotenv import load_dotenv
import os

load_dotenv()

from api.routes import auth, search, watchlist, random as random_route, history

app = FastAPI(title="Horror Recs API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get("FRONTEND_URL", "http://localhost:5173"), "https://*.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(search.router)
app.include_router(watchlist.router)
app.include_router(random_route.router)
app.include_router(history.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}


# Vercel serverless handler
handler = Mangum(app)
