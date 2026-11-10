import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, delimiter } from 'node:path';

const result = spawnSync(process.execPath, ['run', '--bun', 'build'], {
  cwd: fileURLToPath(new URL('../frontend', import.meta.url)),
  env: { ...process.env, PATH: `${dirname(process.execPath)}${delimiter}${process.env.PATH || ''}` },
  stdio: 'inherit',
});
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
