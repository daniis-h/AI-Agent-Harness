// One-time setup after cloning: npm run setup
// Creates .env from .env.example (never overwrites yours) and a sample
// workspace folder the agent is allowed to use. Safe to run again.
import { copyFile, mkdir, writeFile, access } from 'node:fs/promises';

const exists = (path: string) => access(path).then(() => true, () => false);

if (await exists('.env')) {
  console.log('✔ .env already exists (kept as it is)');
} else {
  await copyFile('.env.example', '.env');
  console.log('✔ created .env from .env.example');
}

await mkdir('workspace', { recursive: true });
if (!(await exists('workspace/notes.txt'))) {
  await writeFile('workspace/notes.txt',
    'Hello from the workspace! The agent may read and write files here.\n');
}
console.log('✔ workspace/ is ready (the only folder the agent may touch)');
console.log('\nNext: npm run check   then   npm run demo:workspace');
