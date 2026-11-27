# src/tools

What the agent can DO. Each tool = a name, a description, a JSON Schema and `execute`.

- `workspace.ts`: `read_file` / `write_file`, confined to one folder (lecture 3)
- `command.ts`: `run_command`, a menu of commands you define (lecture 3)

Tools import types from `src/core`; `src/core` never imports from here.
Adding a tool? See CONTRIBUTING.md for ideas.
