// The tool registry: the ONE place that knows every tool.
// It checks names once, at startup, and hands the model the menu.
import type { Tool, ToolDefinition } from './types.ts';

// Starts with a letter; then letters, digits, _ or -.
const NAME = /^[a-zA-Z][a-zA-Z0-9_-]*$/;

export class ToolRegistry {
  private readonly tools = new Map<string, Tool>();

  constructor(tools: readonly Tool[]) {
    for (const tool of tools) {
      if (!NAME.test(tool.name)) {
        throw new Error(`Invalid tool name: ${tool.name}`);
      }
      if (this.tools.has(tool.name)) {
        throw new Error(`Duplicate tool name: ${tool.name}`);
      }
      this.tools.set(tool.name, tool);
    }
  }

  // The menu for the model: every tool WITHOUT execute.
  definitions(): ToolDefinition[] {
    return [...this.tools.values()].map(
      ({ name, description, parameters }) =>
        ({ name, description, parameters }));
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }
}
