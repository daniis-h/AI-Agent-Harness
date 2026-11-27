import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, stat, symlink, writeFile } from 'node:fs/promises';
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

test('refuses to write more than 1 MB, before touching the file', async (t) => {
  const { dir, ws } = await sandbox();
  t.after(() => rm(dir, { recursive: true, force: true }));
  await assert.rejects(ws.write('big.txt', 'x'.repeat(2_000_000)),
    /larger than 1000000 bytes/);
  // Checked before open(), so no empty file is left behind...
  await assert.rejects(stat(join(dir, 'ws', 'big.txt')), { code: 'ENOENT' });
  // ...and an existing file is not truncated.
  await assert.rejects(ws.write('a.txt', 'x'.repeat(2_000_000)));
  assert.equal(await ws.read('a.txt'), 'inside');
});

test('the write limit counts bytes, not characters', async (t) => {
  const { dir, ws } = await sandbox();
  t.after(() => rm(dir, { recursive: true, force: true }));
  // 300,000 emoji: 600,000 UTF-16 characters, but 1,200,000 UTF-8 bytes.
  const emoji = '😀'.repeat(300_000);
  assert.ok(emoji.length < 1_000_000);
  await assert.rejects(ws.write('emoji.txt', emoji), /larger than/);
  // Exactly at the limit is still allowed.
  await ws.write('max.txt', 'x'.repeat(1_000_000));
  assert.equal((await stat(join(dir, 'ws', 'max.txt'))).size, 1_000_000);
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
