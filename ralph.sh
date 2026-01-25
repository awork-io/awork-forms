#!/bin/bash

# Ralph Wiggum Loop for awork Forms
# Each iteration runs in a fresh context window

set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <iterations>"
  echo "Example: $0 20"
  exit 1
fi

MAX_ITERATIONS=$1
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
  # Using --output-format text for cleaner output
  result=$(claude -p "$(cat PROMPT.md)" --output-format text 2>&1) || true

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
