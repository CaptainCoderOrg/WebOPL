#!/usr/bin/env python3
"""
PreToolUse hook to block 'npm run dev' commands.
Prevents accidentally starting the dev server.
"""
import json
import sys

def main():
    # Read the tool call data from stdin
    try:
        input_data = json.load(sys.stdin)
    except json.JSONDecodeError:
        # If we can't parse input, allow the operation
        sys.exit(0)

    tool_input = input_data.get("tool_input", {})
    command = tool_input.get("command", "")

    if not command:
        # No command, allow the operation
        sys.exit(0)

    # Normalize whitespace and check for npm run dev
    normalized_command = " ".join(command.split())

    if "npm run dev" in normalized_command:
        print("Access denied: 'npm run dev' is blocked.", file=sys.stderr)
        print("Please run the dev server manually if needed.", file=sys.stderr)
        sys.exit(2)  # Exit code 2 = block the tool

    # Allow the operation
    sys.exit(0)

if __name__ == "__main__":
    main()
