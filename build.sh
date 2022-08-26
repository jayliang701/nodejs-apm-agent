#!/bin/bash
npm run clean && mkdir ./dist/proto && ./node_modules/.bin/ncp src/lib/proto dist/proto && ./node_modules/.bin/ncp src/agent.config.js dist/agent.config.js && ./node_modules/.bin/ncc build ./src/index.ts -m -o ./dist && ./node_modules/.bin/rename -f ./dist/index.js nodejs-apm-agent.js && ./node_modules/.bin/ncc build ./src/agent-worker.ts -m -o ./dist && ./node_modules/.bin/rename -f ./dist/index.js agent-worker.js