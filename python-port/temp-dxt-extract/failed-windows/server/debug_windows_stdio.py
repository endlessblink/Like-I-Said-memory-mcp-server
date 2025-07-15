#!/usr/bin/env python3
"""Debug Windows stdio issues"""

import sys
import os
import json

# Log everything
print(f"Python: {sys.version}", file=sys.stderr)
print(f"Platform: {sys.platform}", file=sys.stderr)
print(f"stdin: {sys.stdin}", file=sys.stderr)
print(f"stdout: {sys.stdout}", file=sys.stderr)
print(f"stderr: {sys.stderr}", file=sys.stderr)
print(f"stdin isatty: {sys.stdin.isatty()}", file=sys.stderr)
print(f"stdout isatty: {sys.stdout.isatty()}", file=sys.stderr)

# Test JSON communication
test_request = {"jsonrpc": "2.0", "id": 1, "method": "test"}
print(f"Sending: {json.dumps(test_request)}", file=sys.stderr)
print(json.dumps(test_request), flush=True)

print("Now waiting for input...", file=sys.stderr)
try:
    line = sys.stdin.readline()
    if line:
        print(f"Received: {line.strip()}", file=sys.stderr)
    else:
        print("No input received", file=sys.stderr)
except Exception as e:
    print(f"Error reading: {e}", file=sys.stderr)
