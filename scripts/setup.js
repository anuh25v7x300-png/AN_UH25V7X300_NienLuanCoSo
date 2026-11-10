import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join, dirname, delimiter } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
if (!Bun.semver.satisfies(Bun.version, '>=1.4.4')) {
  console.error('Cần Bun >= 1.4.4. Chạy setup.cmd (Windows) hoặc sh setup.sh (Linux/macOS) để tự cài môi trường.');
  process.exit(1);
}
const childEnv = { ...process.env, PATH: `${dirname(process.execPath)}${delimiter}${process.env.PATH || ''}` };
const env = join(root, 'backend', '.env');
if (!existsSync(env)) copyFileSync(join(root, 'backend', '.env.example'), env);
mkdirSync(join(root, 'backend', 'data', 'uploads'), { recursive: true });
for (const [folder, args] of [['backend', ['install', '--frozen-lockfile']], ['frontend', ['install', '--frozen-lockfile']], ['backend', ['run', 'seed']]]) {
  const result = spawnSync(process.execPath, args, { cwd: join(root, folder), env: childEnv, stdio: 'inherit' });
  if (result.error || result.status !== 0) {
    console.error(result.error?.message || `Không thể hoàn tất cài đặt ${folder}.`);
    process.exit(result.status || 1);
  }
}
console.log('Đã cài đặt và tạo dữ liệu mẫu. Chạy bun run dev, mở http://localhost:5173');
