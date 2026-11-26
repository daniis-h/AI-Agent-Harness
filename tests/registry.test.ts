import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ToolRegistry } from '../src/core/registry.ts';
import { validate } from '../src/core/validate.ts';

const tool = (name: string) => ({
  name, description: '', parameters: { type: 'object' },
  async execute() { return null; }
});

test('rejects bad and duplicate tool names', () => {
  assert.throws(() => new ToolRegistry([tool('2fast')]), /Invalid/);
  assert.throws(() => new ToolRegistry([tool('a'), tool('a')]),
    /Duplicate/);
});

test('reports nested problems with a path', () => {
  const schema = {
    type: 'object', additionalProperties: false,
    properties: { flags: { type: 'array', items: { type: 'string' } } }
  };
  assert.deepEqual(validate({ flags: [1], x: 0 }, schema), [
    '$.flags[0]: expected string', '$.x: unexpected property'
  ]);
});
