"""
Schedule the weekly pipeline to run automatically.
Fetches new horror films from TMDb and updates Pinecone.

Usage:
    python scripts/schedule_pipeline.py --install    # Set up weekly run
    python scripts/schedule_pipeline.py --remove     # Remove scheduled task
    python scripts/schedule_pipeline.py --now        # Run immediately
"""

import subprocess
import sys
import json
import os
from pathlib import Path
from datetime import datetime
import argparse
from dotenv import load_dotenv

load_dotenv()

PROJECT_ROOT = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = PROJECT_ROOT / "scripts"
LOG_FILE = PROJECT_ROOT / "logs" / "pipeline.log"
LOG_FILE.parent.mkdir(exist_ok=True)


def log(msg: str):
    """Log to both console and file."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_msg = f"[{timestamp}] {msg}"
    print(log_msg)
    with open(LOG_FILE, "a") as f:
        f.write(log_msg + "\n")


def run_pipeline():
    """Execute the full weekly pipeline."""
    log("=" * 60)
    log("STARTING WEEKLY PIPELINE")
    log("=" * 60)

    steps = [
        ("Fetching horror films from TMDb", "scrape_films.py"),
        ("Creating embeddings and indexing", "embed_and_index.py"),
        ("Updating streaming platforms", "patch_streaming.py"),
    ]

    for step_name, script_name in steps:
        log(f"\n[STEP] {step_name}...")
        try:
            result = subprocess.run(
                [sys.executable, str(SCRIPTS_DIR / script_name)],
                cwd=str(PROJECT_ROOT),
                capture_output=True,
                text=True,
                timeout=3600,
            )
            if result.returncode == 0:
                log(f"✓ {step_name} completed")
            else:
                log(f"✗ {step_name} failed: {result.stderr}")
                if "Fetching" in step_name or "Creating" in step_name:
                    log("ABORTING PIPELINE")
                    return False
        except subprocess.TimeoutExpired:
            log(f"✗ {step_name} timed out")
            return False
        except Exception as e:
            log(f"✗ {step_name} error: {e}")
            return False

    log("\n" + "=" * 60)
    log("PIPELINE COMPLETE ✓")
    log("=" * 60)
    return True


def install_windows_task():
    """Install Windows Task Scheduler job (Windows only)."""
    if sys.platform != "win32":
        print("Error: This method only works on Windows")
        return False

    try:
        task_name = "ReelScreamWeeklyPipeline"
        script_path = str(SCRIPTS_DIR / "schedule_pipeline.py")
        python_exe = sys.executable

        # Create scheduled task that runs Sunday at 2 AM
        cmd = (
            f'schtasks /create /tn "{task_name}" /tr '
            f'"{python_exe} {script_path} --now" '
            f'/sc weekly /d SUN /st 02:00:00 /f'
        )

        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✓ Task '{task_name}' installed")
            print(f"  Runs: Every Sunday at 2:00 AM")
            print(f"  Script: {script_path}")
            return True
        else:
            print(f"✗ Failed to install task: {result.stderr}")
            return False
    except Exception as e:
        print(f"Error: {e}")
        return False


def remove_windows_task():
    """Remove Windows Task Scheduler job."""
    if sys.platform != "win32":
        print("Error: This method only works on Windows")
        return False

    try:
        task_name = "ReelScreamWeeklyPipeline"
        cmd = f'schtasks /delete /tn "{task_name}" /f'
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✓ Task '{task_name}' removed")
            return True
        else:
            print(f"✗ Failed to remove task: {result.stderr}")
            return False
    except Exception as e:
        print(f"Error: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(
        description="Schedule weekly horror film pipeline"
    )
    parser.add_argument(
        "--install",
        action="store_true",
        help="Install weekly scheduled task (Windows)",
    )
    parser.add_argument(
        "--remove",
        action="store_true",
        help="Remove scheduled task (Windows)",
    )
    parser.add_argument(
        "--now",
        action="store_true",
        help="Run pipeline immediately",
    )

    args = parser.parse_args()

    if args.now:
        success = run_pipeline()
        sys.exit(0 if success else 1)
    elif args.install:
        success = install_windows_task()
        sys.exit(0 if success else 1)
    elif args.remove:
        success = remove_windows_task()
        sys.exit(0 if success else 1)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
