@echo off
REM Weekly pipeline: Fetch new horror films and update Pinecone

cd /d "C:\Users\nrhone\OneDrive - Guess Inc\Desktop\horror-recs"

REM Load environment variables from .env
for /f "delims=" %%i in ('type .env') do set %%i

echo [%date% %time%] Starting weekly pipeline...
echo.

REM Step 1: Fetch all horror films from TMDb
echo [Step 1] Fetching horror films from TMDb...
python scripts/scrape_films.py
if errorlevel 1 (
    echo [ERROR] scrape_films.py failed
    exit /b 1
)
echo [OK] Films fetched
echo.

REM Step 2: Create embeddings and index in Pinecone
echo [Step 2] Creating embeddings and indexing in Pinecone...
python scripts/embed_and_index.py
if errorlevel 1 (
    echo [ERROR] embed_and_index.py failed
    exit /b 1
)
echo [OK] Embeddings indexed
echo.

REM Step 3: Update streaming platforms (optional)
echo [Step 3] Updating streaming platform info...
python scripts/patch_streaming.py
if errorlevel 1 (
    echo [WARNING] patch_streaming.py failed (non-fatal)
)
echo [OK] Streaming info updated
echo.

echo [%date% %time%] Pipeline complete!
echo.
