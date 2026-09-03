#!/bin/bash
npm run test:dist && \
  npm run lint && \
  npm run typecheck && \
  npm run format:check && \
  npm run check:examples
status=$?

if [ "$status" -eq 0 ]; then
  echo "✅ Ready to publish! Run: npm run publish:github"
else
  echo "FAILED. One or more issues must be fixed."
  exit 1
fi