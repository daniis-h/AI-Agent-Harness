// Lecture 3 demo: the model tries to read a file OUTSIDE the workspace.
// Run: npm run setup (once), then npm run demo:workspace
import { config } from './config.ts';
import { runAgent } from './core/agent.ts';
import { scriptedModel } from './models/fake.ts';
import { commandTool } from './tools/command.ts';
import { Workspace, workspaceTools } from './tools/workspace.ts';

const workspace = await Workspace.open(config.workspace);
const tools = [
  ...workspaceTools(workspace),
  // A menu of ONE command: the model can pick it, never write its own.
  commandTool(workspace.root, {
    node_version: { executable: process.execPath, args: ['--version'] }
  })
];

const model = scriptedModel([
  { content: '', toolCalls: [
    { id: '1', name: 'read_file', arguments: { path: 'notes.txt' } }
  ] },
  { content: '', toolCalls: [   // the sneaky one
    { id: '2', name: 'read_file', arguments: { path: '../.env' } }
  ] },
  { content: '', toolCalls: [
    { id: '3', name: 'run_command', arguments: { command: 'rm -rf /' } }
  ] },
  { content: '', toolCalls: [
    { id: '4', name: 'run_command', arguments: { command: 'node_version' } }
  ] },
  { content: 'Done. I stayed inside the workspace.' }
]);

const result = await runAgent({
  model, tools, prompt: 'Look around', maxSteps: config.maxSteps
});
for (const m of result.messages) {
  if (m.role !== 'tool') continue;
  const text = m.content.length > 60 ? m.content.slice(0, 57) + '...' : m.content;
  console.log(m.isError ? '✖' : '✔', m.callId, text);
}
console.log(`${result.status} in ${result.steps} steps`);
