#!/usr/bin/env python3
import subprocess
import time
from datetime import datetime, timedelta
import sys
import os

# === CONFIGURATION ===
COMMAND = ["claude"]  # Replace with your command, e.g., ["python3", "python-mcp-version_3.py"]
LIMIT_MESSAGE = "You've reached your usage limit"  # Exact string to look for in output
RESET_HOUR = 2  # Hour (24h format) when usage limit resets
PROMPT_BEFORE_LIMIT = (
    "Please continue the task automatically after the usage limit resets. "
    "The task will pause now, but once it resets, please pick up exactly where we left off."
)
LOG_FILE = "auto_resume_log.txt"

def log(msg):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with open(LOG_FILE, "a") as f:
        f.write(f"[{timestamp}] {msg}\n")
    print(f"[{timestamp}] {msg}")

def wait_until_reset():
    now = datetime.now()
    reset_time = now.replace(hour=RESET_HOUR, minute=0, second=0, microsecond=0)
    if now >= reset_time:
        reset_time += timedelta(days=1)
    wait_seconds = (reset_time - now).total_seconds()
    log(f"Waiting until reset at {reset_time.strftime('%Y-%m-%d %H:%M:%S')} ({int(wait_seconds)} seconds)")
    time.sleep(wait_seconds)

def start_task():
    log("Starting session...")
    try:
        process = subprocess.Popen(
            COMMAND,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1
        )
    except Exception as e:
        log(f"Failed to start process: {e}")
        time.sleep(30)
        return None

    try:
        if PROMPT_BEFORE_LIMIT:
            log("Sending pre-limit prompt...")
            process.stdin.write(PROMPT_BEFORE_LIMIT + "\n")
            process.stdin.flush()
    except Exception as e:
        log(f"Failed to send prompt: {e}")

    try:
        for line in process.stdout:
            print(line, end='')
            if LIMIT_MESSAGE.lower() in line.lower():
                log("Usage limit detected.")
                process.terminate()
                return
    except Exception as e:
        log(f"Error while reading process output: {e}")
        process.terminate()

def main():
    log("=== Auto Resume Script Started ===")
    while True:
        start_task()
        wait_until_reset()
        log("Restarting session after reset...")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        log("Script terminated by user.")
        sys.exit(0)
    except Exception as e:
        log(f"Fatal error: {e}")
        sys.exit(1)
