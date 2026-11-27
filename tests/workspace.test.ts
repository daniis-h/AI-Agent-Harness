import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Workspace } from '../src/tools/workspace.ts';
import { commandTool } from '../src/tools/command.ts';
import { runAgent } from '../src/core/agent.ts';
import { scriptedModel } from '../src/models/fake.ts';
import { workspaceTools } from '../src/tools/workspace.ts';

// Every test gets a fresh temp folder: tests never touch your real files.
async function sandbox() {
  const dir = await mkdtemp(join(tmpdir(), 'harness-'));
  await mkdir(join(dir, 'ws'));
  await writeFile(join(dir, 'ws', 'a.txt'), 'inside');
  await writeFile(join(dir, 'secret.txt'), 'outside');
  return { dir, ws: await Workspace.open(join(dir, 'ws')) };
}

test('reads and writes inside the workspace', async (t) => {
  const { dir, ws } = await sandbox();
  t.after(() => rm(dir, { recursive: true, force: true }));
  assert.equal(await ws.read('a.txt'), 'inside');
  await ws.write('b.txt', 'new');
  assert.equal(await ws.read('b.txt'), 'new');
});

test('refuses paths that escape the workspace', async (t) => {
  const { dir, ws } = await sandbox();
  t.after(() => rm(dir, { recursive: true, force: true }));
  await assert.rejects(ws.read('../secret.txt'), /outside the workspace/);
  await assert.rejects(ws.read(join(dir, 'secret.txt')), /relative/);
  await assert.rejects(ws.write('missing/dir/x.txt', 'x'), /ENOENT/);
});

test('refuses symbolic links', async (t) => {
  const { dir, ws } = await sandbox();
  t.after(() => rm(dir, { recursive: true, force: true }));
  try {
    await symlink(join(dir, 'secret.txt'), join(dir, 'ws', 'link.txt'));
  } catch {
    t.skip('this OS user may not create symlinks (Windows without dev mode)');
    return;
  }
  await assert.rejects(ws.read('link.txt'), /Symbolic links/);
});

test('an escape attempt is a recoverable tool error', async (t) => {
  const { dir, ws } = await sandbox();
  t.after(() => rm(dir, { recursive: true, force: true }));
  const result = await runAgent({
    prompt: 'Peek', tools: workspaceTools(ws),
    model: scriptedModel([
      { content: '', toolCalls: [
        { id: '1', name: 'read_file', arguments: { path: '../secret.txt' } }
      ] },
      { content: 'OK, staying inside.' }
    ])
  });
  assert.equal(result.status, 'completed');
  assert.match(String(result.messages[2]?.content), /outside the workspace/);
});

test('commands come from a menu only', async () => {
  const tool = commandTool(process.cwd(), {
    hello: { executable: process.execPath, args: ['-e', 'console.log("hi")'] }
  });
  const signal = new AbortController().signal;
  const ran = await tool.execute({ command: 'hello' }, signal);
  assert.equal((ran as { stdout: string }).stdout.trim(), 'hi');
  await assert.rejects(tool.execute({ command: 'rm -rf /' }, signal),
    /not permitted/);
});
