// The workspace: the ONLY folder the agent's file tools may touch.
// Every path is checked twice: on paper (lexical), then on disk (no
// symlink anywhere on the way). The model can ASK for ../secrets.txt;
// this class refuses to open it. The rule lives in code, not in a prompt.
import { constants } from 'node:fs';
import { lstat, open, realpath } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import type { Tool } from '../core/types.ts';

// Don't follow a symlink at the last step, where the OS supports it.
const NO_FOLLOW = constants.O_NOFOLLOW ?? 0;
// One read must not flood the conversation (or the token bill).
const MAX_BYTES = 1_000_000;

export class Workspace {
  readonly root: string;
  // (No "constructor(readonly root)" shortcut: Node runs .ts files by
  // stripping types, and that shortcut is real code, not just a type.)
  private constructor(root: string) {
    this.root = root;
  }

  /** realpath: resolve the root ONCE, so every later check compares
   *  against the real folder, not a shortcut pointing at it. */
  static async open(root: string): Promise<Workspace> {
    return new Workspace(await realpath(root));
  }

  async read(path: string): Promise<string> {
    const full = await this.check(path, false);
    const file = await open(full, constants.O_RDONLY | NO_FOLLOW);
    try {
      if ((await file.stat()).size > MAX_BYTES) {
        throw new Error(`File is larger than ${MAX_BYTES} bytes`);
      }
      return await file.readFile({ encoding: 'utf8' });
    } finally {
      await file.close(); // always, even when reading failed
    }
  }

  /** Writes a file. The parent folder must already exist: the agent
   *  can't create directory trees wherever it likes. */
  async write(path: string, content: string): Promise<void> {
    const full = await this.check(path, true);
    const flags = constants.O_WRONLY | constants.O_CREAT
      | constants.O_TRUNC | NO_FOLLOW;
    const file = await open(full, flags);
    try {
      await file.writeFile(content, 'utf8');
    } finally {
      await file.close();
    }
  }

  /** Check 1, on paper: relative, and still inside the root. */
  private lexical(path: string): string {
    if (!path || isAbsolute(path)) {
      throw new Error('Expected a relative workspace path');
    }
    const full = resolve(this.root, path);
    const rel = relative(this.root, full);
    if (!rel || rel === '..' || rel.startsWith(`..${sep}`)
        || isAbsolute(rel)) {
      throw new Error('Path is outside the workspace or is its root');
    }
    return full;
  }

  /** Check 2, on disk: no symlink in ANY existing part of the path. */
  private async check(path: string, allowMissingFinal: boolean) {
    const full = this.lexical(path);
    const parts = relative(this.root, full).split(/[\\/]/);
    let current = this.root;
    for (let i = 0; i < parts.length; i++) {
      current = resolve(current, parts[i]!);
      const last = i === parts.length - 1;
      try {
        const stat = await lstat(current); // lstat: does NOT follow links
        if (stat.isSymbolicLink()) {
          throw new Error('Symbolic links are not permitted');
        }
        if (!last && !stat.isDirectory()) {
          throw new Error('Parent is not a directory');
        }
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (allowMissingFinal && last && code === 'ENOENT') break;
        throw error;
      }
    }
    return full;
  }
}

/** The two file tools the model sees. Arguments are validated by the
 *  harness first (lecture 2); the workspace checks the path itself. */
export function workspaceTools(workspace: Workspace): Tool[] {
  return [
    {
      name: 'read_file',
      description: 'Read a UTF-8 text file inside the workspace',
      parameters: {
        type: 'object', additionalProperties: false, required: ['path'],
        properties: { path: { type: 'string' } }
      },
      async execute(value) {
        const { path } = value as { path: string };
        return workspace.read(path);
      }
    },
    {
      name: 'write_file',
      description: 'Write a UTF-8 text file inside the workspace',
      parameters: {
        type: 'object', additionalProperties: false,
        required: ['path', 'content'],
        properties: { path: { type: 'string' }, content: { type: 'string' } }
      },
      async execute(value) {
        const { path, content } = value as { path: string; content: string };
        await workspace.write(path, content);
        return `Wrote ${content.length} characters to ${path}`;
      }
    }
  ];
}
