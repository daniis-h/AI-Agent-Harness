// Settings come from the environment (.env), never hard-coded in the code.
// `npm run setup` creates .env from .env.example; npm scripts load it with
// node --env-file-if-exists=.env (built into Node 24, no dotenv needed).

function positiveInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1) {
    // Fail at startup with a clear message, not mid-run with a weird one.
    throw new Error(`${name} must be a positive integer, got "${raw}"`);
  }
  return value;
}

export const config = {
  /** The only folder the agent's file tools may touch. */
  workspace: process.env.AGENT_WORKSPACE || './workspace',
  /** How many model turns one run may take. */
  maxSteps: positiveInt('AGENT_MAX_STEPS', 10),
} as const;
