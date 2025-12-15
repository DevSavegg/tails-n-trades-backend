import { spawn } from 'node:child_process';
import path from 'node:path';

const task = process.argv[2];
const isWin = process.platform === 'win32';

const extension = isWin ? 'bat' : 'sh';
const scriptPath = path.join('scripts', `${task}.${extension}`);

console.log(`[BUN] Running ${task} script for ${isWin ? 'Windows' : 'Unix'}...`);

const child = spawn(scriptPath, [], {
  stdio: 'inherit',
  shell: true,
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
