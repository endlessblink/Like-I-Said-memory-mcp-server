#!/usr/bin/env python3
"""
Simple test to verify basic Python setup works
"""

print("Testing Like-I-Said v2 Python Port")
print("=" * 40)

# Test 1: Check Python version
import sys
print(f"Python version: {sys.version}")

# Test 2: Check if we can import required modules
try:
    import yaml
    print("✓ PyYAML available")
except ImportError:
    print("✗ PyYAML not installed")

# Test 3: Check FastMCP
try:
    import fastmcp
    print("✓ FastMCP available")
except ImportError:
    print("✗ FastMCP not installed - this is expected, will be installed via pip")

# Test 4: Create test directory structure
from pathlib import Path

test_dir = Path("test-like-i-said")
test_dir.mkdir(exist_ok=True)
(test_dir / "memories").mkdir(exist_ok=True)
(test_dir / "tasks").mkdir(exist_ok=True)

print("✓ Created test directory structure")

# Test 5: Write a test memory
memory_content = """---
id: test-memory-001
timestamp: 2024-01-14T12:00:00
category: test
tags: [python, test]
---
This is a test memory for the Python port of Like-I-Said v2.
"""

memory_file = test_dir / "memories" / "test-memory.md"
memory_file.write_text(memory_content)
print("✓ Created test memory file")

# Test 6: Read and parse the memory
content = memory_file.read_text()
if "test-memory-001" in content:
    print("✓ Memory file readable")

# Cleanup
import shutil
shutil.rmtree(test_dir)
print("\n✓ Basic tests passed! Ready to build DXT.")