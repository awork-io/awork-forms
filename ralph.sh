#!/bin/bash

# Ralph Wiggum Loop for awork Forms
# Original technique by Geoffrey Huntley: https://ghuntley.com/ralph/
# "In its purest form, Ralph is a Bash loop"

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
MAX_ITERATIONS=${1:-15}

cd "$PROJECT_DIR"

echo "=========================================="
echo "  Ralph Wiggum Loop - awork Forms"
echo "  Project: $PROJECT_DIR"
echo "  Max iterations: $MAX_ITERATIONS"
echo "=========================================="
echo ""
echo "Starting loop... (Ctrl+C to stop)"
echo ""

i=0
while [ $i -lt $MAX_ITERATIONS ]; do
  i=$((i + 1))
  
  # Show progress
  COMPLETED=$(grep -c '"passes": true' plan.md 2>/dev/null || echo "0")
  TOTAL=$(grep -c '"passes":' plan.md 2>/dev/null || echo "0")
  
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  Iteration $i of $MAX_ITERATIONS"
  echo "  Progress: $COMPLETED / $TOTAL tasks"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  # The original Ralph loop - pipe prompt to claude
  # This runs interactively so you see everything
  cat PROMPT.md | claude --dangerously-skip-permissions --model claude-opus-4-20250514
  
  # Check if all tasks complete
  if grep -q "COMPLETE" /tmp/ralph_last_output.txt 2>/dev/null; then
    echo ""
    echo "=========================================="
    echo "  All tasks complete!"
    echo "=========================================="
    exit 0
  fi
  
  echo ""
  sleep 2
done

echo ""
echo "Reached max iterations ($MAX_ITERATIONS)"
