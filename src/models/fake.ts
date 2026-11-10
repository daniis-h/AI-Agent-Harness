// The model gateway layer: one adapter file per provider (openai.ts,
// anthropic.ts... later). This one is a FAKE for tests and demos: no API key,
// no network, no tokens, and the same result every time (a flight simulator).
import type { Model } from '../core/types.ts';

type Reply = Awaited<ReturnType<Model['generate']>>;

/** Hands out the given replies one by one. */
export function scriptedModel(responses: Reply[]): Model {
  let index = 0;
  return {
    async generate() {
      const response = responses[index++];
      // Asked one time too many? Fail loudly instead of passing silently.
      if (!response) throw new Error('Scripted model exhausted');
      return response;
    }
  };
}
