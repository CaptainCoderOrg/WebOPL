#!/usr/bin/env python3
"""
UserPromptSubmit hook to add context from OnPromptSubmit.md file.
Reads the file and includes its entire contents as additional context.
"""
import json
import sys
import os

def main():
    # Path to the context file (relative to project root)
    context_file = ".claude/OnPromptSubmit.md"

    # Check if file exists
    if not os.path.exists(context_file):
        # If file doesn't exist, just pass through without error
        output = {
            "hookSpecificOutput": {}
        }
        print(json.dumps(output))
        sys.exit(0)

    try:
        # Read the entire file content
        with open(context_file, 'r', encoding='utf-8') as f:
            context_content = f.read()

        # Output JSON with additionalContext
        output = {
            "hookSpecificOutput": {
                "additionalContext": context_content
            }
        }

        print(json.dumps(output))
        sys.exit(0)

    except Exception as e:
        # If there's an error reading the file, pass through without blocking
        print(f"Warning: Could not read {context_file}: {e}", file=sys.stderr)
        output = {
            "hookSpecificOutput": {}
        }
        print(json.dumps(output))
        sys.exit(0)

if __name__ == "__main__":
    main()
