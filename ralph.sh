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
echo "  Model: claude-opus-4-20250514"
echo "=========================================="
echo ""

cd "$PROJECT_DIR"

for ((i=1; i<=$MAX_ITERATIONS; i++)); do
  # Check current progress
  COMPLETED=$(grep -c '"passes": true' plan.md 2>/dev/null || echo "0")
  TOTAL=$(grep -c '"passes":' plan.md 2>/dev/null || echo "0")
  
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  Iteration $i of $MAX_ITERATIONS"
  echo "  Progress: $COMPLETED / $TOTAL tasks complete"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  # Run claude - using stream-json for real-time output
  LOG_FILE="/tmp/ralph_iteration_${i}.log"
  
  # Stream JSON shows tool calls and progress in real-time
  claude -p "$(cat PROMPT.md)" \
    --model claude-opus-4-20250514 \
    --verbose \
    --output-format stream-json 2>&1 | \
    tee "$LOG_FILE" | \
    while IFS= read -r line; do
      # Parse stream-json and show relevant info
      if echo "$line" | grep -q '"type":"assistant"'; then
        # Show assistant text
        TEXT=$(echo "$line" | grep -o '"text":"[^"]*"' | head -1 | sed 's/"text":"//;s/"$//')
        [ -n "$TEXT" ] && echo "$TEXT"
      elif echo "$line" | grep -q '"type":"tool_use"'; then
        # Show tool being used
        TOOL=$(echo "$line" | grep -o '"name":"[^"]*"' | head -1 | sed 's/"name":"//;s/"$//')
        [ -n "$TOOL" ] && echo "🔧 Tool: $TOOL"
      elif echo "$line" | grep -q '"type":"result"'; then
        echo "✅ Tool completed"
      fi
    done || true

  # Check for completion promise in the log
  if grep -q "COMPLETE" "$LOG_FILE" 2>/dev/null; then
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
