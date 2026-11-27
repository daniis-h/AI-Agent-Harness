// Commands: the model CHOOSES from a menu you wrote; it never invents one.
// No shell, no extra arguments, a timeout and an output cap.
// Note: this limits WHICH commands run, not WHAT they do. A test script
// can still read files or use the network. Untrusted repos need real
// isolation (a container or OS sandbox): later in the course.
import { spawn } from 'node:child_process';
import type { Tool } from '../core/types.ts';

export type CommandPreset = {
  executable: string;          // e.g. process.execPath (the node binary)
  args: readonly string[];     // fixed by YOU, never by the model
  timeoutMs?: number;          // default 10 s
};

export type CommandResult = {
  exitCode: number | null;
  stdout: string;
  stderr: string;
};

const MAX_OUTPUT = 65_536; // characters, per stream

export function commandTool(
  cwd: string, presets: Record<string, CommandPreset>
): Tool {
  const names = Object.keys(presets);
  return {
    name: 'run_command',
    description: `Run one allowed command: ${names.join(', ')}`,
    // The enum puts the menu in the schema: lecture 2's validator
    // rejects any other name before execute even runs.
    parameters: {
      type: 'object', additionalProperties: false, required: ['command'],
      properties: { command: { type: 'string', enum: names } }
    },
    async execute(value, signal): Promise<CommandResult> {
      signal.throwIfAborted();
      const name = (value as { command: string }).command;
      // Defense in depth: check again, even after validation.
      if (!Object.hasOwn(presets, name)) {
        throw new Error('Command not permitted');
      }
      const preset = presets[name]!;
      const timeout = preset.timeoutMs ?? 10_000;
      if (!Number.isSafeInteger(timeout) || timeout < 1) {
        throw new Error('Invalid timeout');
      }
      return new Promise((done, fail) => {
        // shell: false = no pipes, no ;, no && : just this program.
        const child = spawn(preset.executable, [...preset.args], {
          cwd, shell: false, signal, windowsHide: true,
          stdio: ['ignore', 'pipe', 'pipe']
        });
        const out = { stdout: '', stderr: '' };
        const timer = setTimeout(() => child.kill(), timeout);
        for (const key of ['stdout', 'stderr'] as const) {
          child[key].setEncoding('utf8');
          child[key].on('data', (chunk: string) => {
            out[key] += chunk;
            if (out[key].length > MAX_OUTPUT) child.kill(); // too chatty
          });
        }
        child.on('error', (error) => { clearTimeout(timer); fail(error); });
        child.on('close', (exitCode) => {
          clearTimeout(timer);
          done({ exitCode, ...out });
        });
      });
    }
  };
}
