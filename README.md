# Build an AI Agent From Scratch in TypeScript

[![CI](https://github.com/daniis-h/AI-Agent-Harness/actions/workflows/ci.yml/badge.svg)](https://github.com/daniis-h/AI-Agent-Harness/actions/workflows/ci.yml)
![Node 24+](https://img.shields.io/badge/node-%3E%3D24-339933?logo=node.js&logoColor=white)
![Zero runtime dependencies](https://img.shields.io/badge/runtime%20deps-0-brightgreen)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-ff69b4)](CONTRIBUTING.md)

**The engine behind coding agents, built by hand: an agent loop, tool validation and a safe workspace, in plain
TypeScript with zero runtime dependencies.** Every lecture of the free Zain & Kernel YouTube course
(channel: YouTube link) adds one piece, and every piece is tested.

> The model only **proposes**. Your harness **decides and executes**. That one idea is the whole course.

```
you ──▶ harness ──▶ model        "I want to read notes.txt"
           │  ◀──── tool call
           ├─▶ validate args     (lecture 2)
           ├─▶ check the path    (lecture 3)
           ├─▶ run the tool ──▶ workspace / command menu
           └─▶ result back to the model ... until it answers
```

## Quick start (2 minutes)

```sh
git clone https://github.com/daniis-h/AI-Agent-Harness.git
cd AI-Agent-Harness
npm ci                    # exact versions from package-lock.json (dev tools only)
npm run setup             # creates .env and the workspace/ folder
npm run check             # typecheck + all tests
npm run demo:workspace    # watch the agent try to escape the workspace (and fail)
```

Needs **Node.js 24+** (it runs `.ts` files directly, no build step). `nvm use` picks the right version from `.nvmrc`.

## The course

| # | Lecture | What you add | Video | Code |
|---|---|---|---|---|
| 1 | The agent loop | contracts, the loop, step limit, a fake model, tests | YouTube link | [lecture-1](../../tree/lecture-1) |
| 2 | Validate tool calls | tool registry, JSON Schema validator, `model_error` | YouTube link | [lecture-2](../../tree/lecture-2) |
| 3 | A safe workspace | path confinement, no symlinks, a command menu | YouTube link | [lecture-3](../../tree/lecture-3) |
| 4 | coming soon | real model adapters (OpenAI, Anthropic) | | |

Want the code exactly as it was at the end of a lecture? `git switch --detach lecture-2`.

## Project structure

```
src/
  core/          the harness: knows no provider, no file system
    types.ts       contracts every layer agrees on
    agent.ts       the loop
    registry.ts    tool names, checked at startup
    validate.ts    JSON Schema checks for model arguments
  models/        the gateway: one adapter per AI provider (fake.ts for tests)
  tools/         what the agent can DO: workspace files, a command menu
  config.ts      settings from .env, validated at startup
  demo*.ts       entry points: the only files that wire everything together
tests/           node:test, no API key, no network, no tokens
scripts/setup.ts one-time setup after cloning
```

**The rule:** arrows point inward. `models/` and `tools/` import from `core/`; `core/` never imports from them.

## Build your own agent

1. Add a tool in `src/tools/` (copy `command.ts` or `workspace.ts`): a name, a description, a JSON Schema, `execute`.
2. Write a test in `tests/` with the fake model (`scriptedModel`) so it runs without an API key.
3. Wire it into a demo and run it.

**Built something?** Show it: post in [Discussions > Show and tell](../../discussions) or open a PR that adds your
project to the list below. Small, weird and half-finished agents are welcome.

### Built with this harness

<!-- Add yours: - [name](link): one line about what it does (@your-github) -->
- *Your agent here. Open a PR!*

## Contributing

New to open source? This repo is a good first stop: small files, plain TypeScript, tests for everything.
Read [CONTRIBUTING.md](CONTRIBUTING.md), pick an issue labeled
[`good first issue`](../../issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22), and say "I'll take this".
Every merged contributor is credited in the next lecture's video description.

## Security

This is an educational harness, not an OS sandbox. Read [SECURITY.md](SECURITY.md) before you point it at code you
don't trust.

## License

[MIT](LICENSE): use it, fork it, build products on it.
