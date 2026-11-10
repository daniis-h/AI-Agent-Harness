# Zain & Kernel: Build an AI Agent Harness From Scratch (TypeScript)

Course code for the Zain & Kernel YouTube series. Every lecture builds on the previous one.

- `main`: this overview.
- `lectures`: the code in `ai-harness/`, one commit (+ tag) per lecture.

## Requirements

Node.js 24 or newer (it runs `.ts` files directly) and npm.

## Run it

```sh
cd ai-harness
npm install          # TypeScript + Node types (dev only)
npm run typecheck    # tsc checks every file, writes nothing
npm test             # Node's built-in test runner, no API key needed
npm run demo         # runs the agent with a scripted (fake) model
```

## Lectures

| # | Topic |
|---|---|
| 1 | The agent loop: contracts, the loop, a fake model, tests, a demo |
