#!/usr/bin/env python3
"""
PreToolUse hook to block access to archived files and folders.
Blocks Read, Write, and Edit operations on:
- archived/** (any file in archived directory)
- **/*.archived (any file with .archived extension)
"""
import json
import sys
import os

def main():
    # Read the tool call data from stdin
    try:
        input_data = json.load(sys.stdin)
    except json.JSONDecodeError:
        # If we can't parse input, allow the operation
        sys.exit(0)

    tool_input = input_data.get("tool_input", {})
    file_path = tool_input.get("file_path", "")

    if not file_path:
        # No file path, allow the operation
        sys.exit(0)

    # Normalize path separators for Windows
    file_path = file_path.replace("\\", "/")

    # Check if file is in archived directory or has .archived extension
    if "archived/" in file_path or file_path.endswith(".archived"):
        print(f"Access denied: '{file_path}' is archived and cannot be accessed.", file=sys.stderr)
        print("Archived files are read-only historical documentation.", file=sys.stderr)
        sys.exit(2)  # Exit code 2 = block the tool

    # Allow the operation
    sys.exit(0)

if __name__ == "__main__":
    main()
