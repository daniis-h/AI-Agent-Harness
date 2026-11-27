# Security

## What this harness protects (and what it doesn't)

- **Arguments** from the model are validated against each tool's schema before the tool runs (lecture 2).
- **File tools** stay inside one workspace folder: absolute paths, `..` escapes and symbolic links are refused, and
  files are opened with `O_NOFOLLOW` where the OS supports it (lecture 3).
- **Commands** come from a menu the developer writes: no shell, no extra arguments, a timeout and an output cap.

It is **not an OS sandbox**. A folder can change between the check and the open (a race), an allowed command can do
anything its program does, and killing a timed-out command may not stop its child processes. Never run it against
repositories or prompts you don't trust without real isolation (a container or VM with no secrets mounted).

## Reporting a vulnerability

Please don't open a public issue for a security problem. Use GitHub's
[private vulnerability reporting](../../security/advisories/new) on this repository, with steps to reproduce.
You'll get a reply within a week, and credit in the fix (unless you'd rather not).
