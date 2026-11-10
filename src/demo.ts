// The entry point: the ONLY file that knows every layer and plugs them together.
// Run: npm run demo
import { runAgent } from './core/agent.ts';
import type { Tool } from './core/types.ts';
import { scriptedModel } from './models/fake.ts';

const add: Tool = {
  name: 'add',
  description: 'Add two numbers',
  parameters: {
    type: 'object',
    properties: { a: { type: 'number' }, b: { type: 'number' } },
    required: ['a', 'b']
  },
  async execute(value) {
    // We TRUST the model here: '2' + 3 would give '23'. Fixed in lecture 2.
    const { a, b } = value as { a: number; b: number };
    return a + b;
  }
};

// Turn 1: ask for the add tool. Turn 2: the final answer.
const model = scriptedModel([
  { content: '', toolCalls: [
    { id: 'call-1', name: 'add', arguments: { a: 2, b: 3 } }
  ] },
  { content: 'The result is 5.' }
]);

const result = await runAgent({
  model, tools: [add], prompt: 'Add 2 and 3'
});
// One line per message, then how the run ended.
for (const m of result.messages) {
  const calls = m.role === 'assistant' ? m.toolCalls : undefined;
  console.log(m.role.padEnd(10), JSON.stringify(calls ?? m.content));
}
console.log(`${result.status} in ${result.steps} steps`);
