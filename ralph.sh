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
  
  # Run one iteration - pipe prompt to claude for normal interactive output
  if ! echo "$(cat PROMPT.md)" | claude --dangerously-skip-permissions --model opus 2>&1 | tee /tmp/ralph_output_${i}.log; then
    echo "⚠️  Claude CLI returned error, waiting 10s before retry..."
    sleep 10
    continue
  fi
  
  # Check for "No messages returned" error
  if grep -q "No messages returned" /tmp/ralph_output_${i}.log 2>/dev/null; then
    echo "⚠️  Empty response from Claude, waiting 10s before retry..."
    sleep 10
    continue
  fi
  
  # Check if all tasks complete
  if grep -q "COMPLETE" /tmp/ralph_output_${i}.log 2>/dev/null; then
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
