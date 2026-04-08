import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const root = process.cwd();
const targets = [
  'src/app/biometric',
  'src/app/api/biometric',
  'src/app/api/auth/webauthn',
  'src/app/api/auth/security-questions',
  'src/app/api/auth/demo-accounts',
  'src/app/demo',
  'src/app/welcome',
  'src/app/upgrade',
  'src/app/consent-settings',
  'src/app/dashboard',
  'src/app/admin/reports',
  'src/app/teacher/reports',
  'src/app/admin/bonus-reports',
  'src/app/admin/system-health',
  'src/app/admin/leaderboard',
  'src/app/admin/scoreboard',
  'src/app/student/dashboard',
  'src/app/student/recommendations',
  'src/app/student/ranking',
  'src/app/teacher/dashboard',
  'src/app/teacher/notifications',
  'src/app/teacher/notify-students',
  'src/app/teacher/polls',
  'src/app/teacher/qr',
  'src/app/admin/search',
  'src/app/admin/audit',
  'src/app/admin/audit-logs',
  'src/app/admin/backup',
];

const moved = [];

function moveOut(rel) {
  const src = path.join(root, rel);
  if (!fs.existsSync(src)) return;
  const dst = path.join(root, `${rel}.__disabled__`);
  if (fs.existsSync(dst)) fs.rmSync(dst, { recursive: true, force: true });
  fs.renameSync(src, dst);
  moved.push([src, dst]);
  console.log(`[build-lite] disabled ${rel}`);
}

function restoreAll() {
  for (const [src, dst] of moved.reverse()) {
    if (fs.existsSync(dst)) {
      fs.renameSync(dst, src);
      console.log(`[build-lite] restored ${path.relative(root, src)}`);
    }
  }
}

try {
  for (const rel of targets) moveOut(rel);

  const child = spawn('npm run build', {
    cwd: root,
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      NEXT_TELEMETRY_DISABLED: '1',
      NODE_OPTIONS: process.env.NODE_OPTIONS || '--max-old-space-size=1536',
    },
  });

  child.on('exit', (code) => {
    try {
      restoreAll();
    } finally {
      process.exit(code ?? 1);
    }
  });

  child.on('error', (err) => {
    console.error('[build-lite] failed to start build:', err);
    try {
      restoreAll();
    } finally {
      process.exit(1);
    }
  });
} catch (err) {
  console.error('[build-lite] error:', err);
  try {
    restoreAll();
  } finally {
    process.exit(1);
  }
}
