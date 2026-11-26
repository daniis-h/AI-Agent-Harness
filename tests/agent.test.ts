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

test('invalid arguments never reach the tool', async () => {
  let ran = false;
  const result = await runAgent({
    prompt: 'Echo', tools: [{
      name: 'echo', description: 'Echo text',
      parameters: { type: 'object', required: ['text'],
        properties: { text: { type: 'string' } } },
      async execute() { ran = true; return 'x'; }
    }],
    model: scriptedModel([
      { content: '', toolCalls: [
        { id: '1', name: 'echo', arguments: { text: 42 } }
      ] },
      { content: 'Gave up' }
    ])
  });
  assert.equal(ran, false);
  assert.equal(result.messages[2]?.content,
    'Invalid arguments: $.text: expected string');
});

test('a throwing tool is recoverable', async () => {
  const result = await runAgent({
    prompt: 'Try', tools: [{
      name: 'boom', description: 'Always fails',
      parameters: { type: 'object' },
      async execute() { throw new Error('disk full'); }
    }],
    model: scriptedModel([
      { content: '', toolCalls: [{ id: '1', name: 'boom', arguments: {} }] },
      { content: 'Recovered' }
    ])
  });
  assert.equal(result.status, 'completed');
});

test('a failing model stops the run with model_error', async () => {
  const result = await runAgent({
    prompt: 'Hi', tools: [],
    model: { async generate() { throw new Error('503 overloaded'); } }
  });
  assert.equal(result.status, 'model_error');
  assert.equal(result.error, '503 overloaded');
});
