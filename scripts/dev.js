import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join, dirname, delimiter } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';

const root = fileURLToPath(new URL('..', import.meta.url));
const envFile = join(root, 'backend', '.env');
const configuredPort = existsSync(envFile) ? /^\s*PORT\s*=\s*["']?(\d+)/m.exec(readFileSync(envFile, 'utf8'))?.[1] : undefined;
const apiPort = Number(process.env.PORT || configuredPort || 3001);
if (!Number.isInteger(apiPort) || apiPort < 1 || apiPort > 65535 || apiPort === 5173) {
  console.error('PORT của API cần là số 1–65535 và khác cổng web 5173.');
  process.exit(1);
}
const childEnv = {
  ...process.env,
  PORT: String(apiPort),
  FLOWER_API_PORT: String(apiPort),
  PATH: `${dirname(process.execPath)}${delimiter}${process.env.PATH || ''}`,
};
const services = [
  { name: 'API', cwd: join(root, 'backend'), url: `http://localhost:${apiPort}` },
  { name: 'Web', cwd: join(root, 'frontend'), url: 'http://localhost:5173' },
];
const children = [];
let stopping = false;

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) stopChild(child);
  process.exit(code);
}

function stopChild(child) {
  if (child.pid === undefined) return;
  if (process.platform === 'win32') {
    // bun run starts another process; stop its whole tree on Windows.
    spawnSync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  } else {
    // Stop the entire service group, including Vite and the Bun watcher.
    try { process.kill(-child.pid, 'SIGTERM'); }
    catch (error) { if (error.code !== 'ESRCH') console.error(error.message); }
  }
}

process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
process.on('exit', () => {
  for (const child of children) stopChild(child);
});

for (const service of services) {
  const child = spawn(process.execPath, ['run', 'dev'], {
    cwd: service.cwd,
    stdio: 'inherit',
    env: childEnv,
    detached: process.platform !== 'win32',
    windowsHide: false,
  });
  children.push(child);
  child.on('error', error => {
    console.error(`[${service.name}] Không thể chạy: ${error.message}`);
    stop(1);
  });
  child.on('exit', (code, signal) => {
    if (!stopping) {
      console.error(`[${service.name}] Đã dừng (${signal || code}). Dừng toàn bộ môi trường dev.`);
      stop(code || 1);
    }
  });
}

console.log(`Đang chạy API dev tại http://localhost:${apiPort} và Vite dev tại http://localhost:5173`);
