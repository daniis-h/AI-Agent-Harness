// The contracts every layer agrees on. This file imports nothing:
// core must never depend on a provider (OpenAI, Anthropic...) or on a tool.

/** A tool request written by the model. It is only a request: nothing has run yet. */
export type ToolCall = {
  id: string;         // matches the result to this request (a coat-check ticket)
  name: string;       // which tool the model wants
  arguments: unknown; // written by the model = untrusted; check before use (lecture 2)
};

/** One entry of the conversation the harness sends to the model. */
export type Message =
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string; toolCalls?: ToolCall[] }
  | { role: 'tool'; callId: string; content: string;
      isError: boolean }; // a failed tool is reported back, not thrown

/** What the MODEL sees about a tool: the menu. */
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema for the model
}

/** What the HARNESS keeps: the menu entry + the real code (the kitchen). */
export interface Tool extends ToolDefinition {
  execute(argumentsValue: unknown, signal: AbortSignal):
    Promise<unknown>;
}

/** Any provider fits this shape; adapters live in src/models. */
export interface Model {
  generate(input: {
    messages: readonly Message[];
    tools: readonly ToolDefinition[];
    signal: AbortSignal; // lets the caller cancel a slow request
  }): Promise<{ content: string; toolCalls?: ToolCall[] }>;
}

/** How a run ended. */
export type AgentResult = {
  status: 'completed' | 'step_limit' | 'aborted';
  answer?: string;      // the model's final text (completed only)
  messages: Message[];  // the full conversation, for logs and debugging
  steps: number;        // model turns used
};
