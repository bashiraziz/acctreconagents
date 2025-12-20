#!/bin/bash
# Test script for rate limiting
# This simulates 7 requests to verify rate limiting works

echo "Testing Rate Limiting..."
echo "========================"
echo ""

for i in {1..7}; do
  echo "Request #$i:"
  response=$(curl -s http://localhost:3000/api/rate-limit)
  echo "$response" | python -m json.tool 2>/dev/null || echo "$response"
  echo ""

  # Parse remaining count
  remaining=$(echo "$response" | grep -o '"remaining":[0-9]*' | grep -o '[0-9]*')

  if [ "$remaining" = "0" ]; then
    echo "✓ Rate limit working! Further requests should be blocked."
    break
  fi

  sleep 0.5
done

echo ""
echo "Test complete!"
