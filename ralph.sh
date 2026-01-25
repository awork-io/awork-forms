#!/bin/bash

# Ralph Wiggum Loop for awork Forms
# Each iteration runs in a fresh context window

set -e

MAX_ITERATIONS=${1:-15}

if [ "$MAX_ITERATIONS" -gt 15 ]; then
  echo "Warning: Max iterations capped at 15"
  MAX_ITERATIONS=15
fi
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=========================================="
echo "  Ralph Wiggum Loop - awork Forms"
echo "  Max iterations: $MAX_ITERATIONS"
echo "  Project: $PROJECT_DIR"
echo "=========================================="
echo ""

cd "$PROJECT_DIR"

for ((i=1; i<=$MAX_ITERATIONS; i++)); do
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  Iteration $i of $MAX_ITERATIONS"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  # Run claude with the prompt file
  # Using Opus 4.5 for best quality
  result=$(claude -p "$(cat PROMPT.md)" --model claude-opus-4-20250514 --output-format text 2>&1) || true

  echo "$result"

  # Check for completion promise
  if [[ "$result" == *"<promise>COMPLETE</promise>"* ]]; then
    echo ""
    echo "=========================================="
    echo "  SUCCESS! All tasks complete"
    echo "  Finished after $i iterations"
    echo "=========================================="
    exit 0
  fi

  echo ""
  echo "--- End of iteration $i ---"
  echo ""

  # Small delay between iterations to avoid rate limiting
  sleep 2
done

echo ""
echo "=========================================="
echo "  Reached max iterations ($MAX_ITERATIONS)"
echo "  Check plan.md for remaining tasks"
echo "=========================================="
exit 1
