#!/usr/bin/env python3
"""
Debug script to test Windows stdio handling
Run this directly in Windows to see what's happening
"""

import sys
import os
import json
import time
import io
import msvcrt

print("=== Windows STDIO Debug Test ===")
print(f"Python: {sys.version}")
print(f"Platform: {sys.platform}")
print(f"Executable: {sys.executable}")
print(f"Working Dir: {os.getcwd()}")

# Test 1: Check stdio encoding
print("\n--- STDIO Encoding ---")
print(f"stdin encoding: {sys.stdin.encoding}")
print(f"stdout encoding: {sys.stdout.encoding}")
print(f"stderr encoding: {sys.stderr.encoding}")

# Test 2: Check if we're in a pipe/redirect situation
print("\n--- STDIO Types ---")
print(f"stdin is TTY: {sys.stdin.isatty()}")
print(f"stdout is TTY: {sys.stdout.isatty()}")
print(f"stderr is TTY: {sys.stderr.isatty()}")

# Test 3: Try different ways to read stdin
print("\n--- Testing stdin read methods ---")

# Method 1: Simple readline
print("1. Testing readline()...")
print("Type something and press Enter (or press Ctrl+Z for EOF):")
try:
    line = sys.stdin.readline()
    print(f"   Read: {repr(line)}")
except Exception as e:
    print(f"   Error: {e}")

# Method 2: Read with timeout using select (Windows doesn't support select on stdin)
print("\n2. Testing non-blocking read...")
try:
    # Set stdin to non-blocking mode
    msvcrt.setmode(sys.stdin.fileno(), os.O_BINARY)
    sys.stdin = io.TextIOWrapper(sys.stdin.buffer, encoding='utf-8')
    print("   Stdin reconfigured to binary mode with UTF-8 wrapper")
except Exception as e:
    print(f"   Error reconfiguring stdin: {e}")

# Test 4: JSON communication test
print("\n--- JSON Communication Test ---")
print("Paste this JSON and press Enter:")
print('{"jsonrpc": "2.0", "method": "test", "id": 1}')
print("Waiting for JSON input:")

try:
    json_line = sys.stdin.readline()
    if json_line:
        print(f"Raw input: {repr(json_line)}")
        
        # Try to parse it
        try:
            data = json.loads(json_line.strip())
            print(f"Parsed successfully: {data}")
            
            # Try to send a response
            response = {"jsonrpc": "2.0", "id": 1, "result": "OK"}
            response_str = json.dumps(response)
            print(f"Sending response: {response_str}")
            sys.stdout.flush()
            
        except json.JSONDecodeError as e:
            print(f"JSON parse error: {e}")
    else:
        print("No input received (EOF)")
        
except Exception as e:
    print(f"Error in JSON test: {e}")

print("\n=== Debug test complete ===")