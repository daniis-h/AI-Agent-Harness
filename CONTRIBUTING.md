# Contributing

Thanks for being here. Every contribution counts: a typo fix, a test, a new tool, or a question that shows us where
the docs are unclear. **Every merged contributor is credited in the next lecture's video description.**

## Set up (2 minutes)

```sh
git clone https://github.com/<you>/AI-Agent-Harness.git   # your fork
cd AI-Agent-Harness
npm ci && npm run setup && npm run check
```

Node.js 24+ only. No API keys are needed to develop or test.

## Ways to help

| You have... | Do this |
|---|---|
| 5 minutes | fix a typo or an unclear comment; star the repo |
| 30 minutes | take a [`good first issue`](../../issues?q=label%3A%22good+first+issue%22): small, explained, with a hint |
| an evening | add a tool in `src/tools/` with tests (ideas below) |
| built an agent | add it to "Built with this harness" in the README, or post it in Discussions > Show & Tell |
| found a bug | open an issue with the steps to reproduce (the template asks for them) |

**Tool ideas** (each one = one PR): `list_dir`, `search_text` (grep inside the workspace), `append_file`,
a max size for `write_file`, a dry-run mode for `run_command`, a `--json` output for the demos.

## Making a pull request

1. Comment on the issue first ("I'll take this") so two people don't build the same thing.
2. Create a branch: `git switch -c feat/list-dir-tool`.
3. Keep the house rules:
   - `core/` never imports from `models/` or `tools/` (arrows point inward).
   - Zero runtime dependencies. Dev dependencies need a good reason.
   - Model output is untrusted: validate it, never `as any` it.
   - Every new behaviour gets a test that runs with the fake model (no network, no keys).
   - Comments explain **why**, for a learner reading the file for the first time.
4. `npm run check` must pass (CI runs it on every PR).
5. Open the PR and fill in the template. Small PRs get reviewed fastest.

Commit messages: short, present tense: `Add list_dir tool`, `Fix path check on Windows`.

## Questions

Ask in [Discussions](../../discussions) (Q&A). No question is too basic: that's what the course is for.

By contributing you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md) and that your work is released under
the [MIT License](LICENSE).
