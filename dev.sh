#!/bin/bash
npm run build
cross-env APM_AGENT_CONFIG="./agent.config.js" node -r './dist/index.js' server