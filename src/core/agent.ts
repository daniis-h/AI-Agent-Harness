// The agent loop: the model PROPOSES actions, the harness EXECUTES them.
//   1. send the conversation + the tool menu to the model
//   2. save its reply
//   3. if it asked for tools: run them, save the results
//   4. repeat until it answers without tools, or the step limit is hit
import type { AgentResult, Message, Model, Tool } from './types.ts';
import { ToolRegistry } from './registry.ts';
import { validate } from './validate.ts';

export async function runAgent(options: {
  model: Model;           // passed in, never imported: any provider fits
  tools: readonly Tool[]; // passed in too: core knows no concrete tool
  prompt: string;
  maxSteps?: number;      // the harness, not the model, decides how long it runs
  signal?: AbortSignal;   // cancel from outside (user pressed stop)
}): Promise<AgentResult> {
  const { model, tools, prompt, maxSteps = 10 } = options;
  // Fail early with a clear message: 0, -1 or 2.5 make no sense.
  if (!Number.isSafeInteger(maxSteps) || maxSteps < 1) {
    throw new RangeError('maxSteps must be a positive safe integer');
  }
  // No signal given? Use one that never fires, so the code below stays simple.
  const signal = options.signal ?? new AbortController().signal;
  const messages: Message[] = [{ role: 'user', content: prompt }];
  // Bad or duplicate tool names fail HERE, at startup, not mid-run.
  const registry = new ToolRegistry(tools);
  const definitions = registry.definitions(); // the menu
  // Every early exit looks the same.
  const aborted = (steps: number): AgentResult =>
    ({ status: 'aborted', messages, steps });

  for (let step = 0; step < maxSteps; step++) {
    if (signal.aborted) return aborted(step);
    let response;
    try {
      // A COPY of the messages: the model can't edit our history.
      response = await model.generate(
        { messages: [...messages], tools: definitions, signal });
    } catch (error) {
      if (signal.aborted) return aborted(step); // we cancelled: clean exit
      // A MODEL problem: no model left to read an error. Stop cleanly.
      return { status: 'model_error', messages, steps: step,
        error: error instanceof Error ? error.message : String(error) };
    }
    if (signal.aborted) return aborted(step);
    const calls = response.toolCalls ?? [];
    messages.push({ role: 'assistant', content: response.content,
      ...(calls.length ? { toolCalls: calls } : {}) });
    // The exit door: no tool calls means the model is done.
    if (!calls.length) {
      return { status: 'completed', answer: response.content,
        messages, steps: step + 1 };
    }

    for (const call of calls) {
      if (signal.aborted) return aborted(step + 1);
      const tool = registry.get(call.name);
      if (!tool) {
        // Unknown tool: tell the model (same call id) instead of crashing.
        messages.push({ role: 'tool', callId: call.id,
          content: `Unknown tool: ${call.name}`, isError: true });
        continue;
      }
      // The border check: untrusted arguments never reach execute.
      const problems = validate(call.arguments, tool.parameters);
      if (problems.length) {
        messages.push({ role: 'tool', callId: call.id,
          content: `Invalid arguments: ${problems.join('; ')}`,
          isError: true });
        continue;
      }
      try {
        const result = await tool.execute(call.arguments, signal);
        if (signal.aborted) return aborted(step + 1);
        messages.push({ role: 'tool', callId: call.id,
          content: JSON.stringify(result) ?? 'null', isError: false });
      } catch (error) {
        if (signal.aborted) return aborted(step + 1);
        // A failing tool is not the end of the run: the model reads the
        // error on its next turn and can try something else.
        messages.push({ role: 'tool', callId: call.id,
          content: error instanceof Error ? error.message
                                          : String(error),
          isError: true });
      }
    }
  }
  // Out of steps: the model may want more work, but we stop here.
  return { status: 'step_limit', messages, steps: maxSteps };
}
