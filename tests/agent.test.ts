// Node's built-in test runner: no extra library. Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runAgent } from '../src/core/agent.ts';
import { scriptedModel } from '../src/models/fake.ts';

test('executes a tool and returns the final answer', async () => {
  const result = await runAgent({
    prompt: 'Say hello',
    tools: [{
      name: 'hello', description: 'Return a greeting',
      parameters: { type: 'object' },
      async execute() { return 'Hello'; }
    }],
    // The fake model asks for "hello" first, then says "Done".
    model: scriptedModel([
      { content: '', toolCalls: [
        { id: '1', name: 'hello', arguments: {} }
      ] },
      { content: 'Done' }
    ])
  });
  assert.equal(result.status, 'completed');
  assert.equal(result.answer, 'Done');
  // messages: [0] user, [1] assistant tool request, [2] tool result
  assert.deepEqual(result.messages[2], {
    role: 'tool', callId: '1', content: '"Hello"', isError: false
  });
});

test('stops at the step limit', async () => {
  // One step, spent on the tool request: no step left for an answer.
  const result = await runAgent({
    prompt: 'Loop forever', maxSteps: 1, tools: [],
    model: scriptedModel([
      { content: '', toolCalls: [
        { id: '1', name: 'missing', arguments: {} }
      ] }
    ])
  });
  assert.equal(result.status, 'step_limit');
});
