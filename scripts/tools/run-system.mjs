import { spawn } from 'node:child_process';
import { networkInterfaces } from 'node:os';

const PORT = Number(process.env.PORT || 3000);
const HOST = '0.0.0.0';
const PROTOCOL = 'https';
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

let appProcess = null;
let shuttingDown = false;

function getLanUrls(port, protocol = 'https') {
  const interfaces = networkInterfaces();
  const urls = new Set();

  for (const entries of Object.values(interfaces)) {
    for (const entry of entries || []) {
      if (!entry || entry.family !== 'IPv4' || entry.internal) continue;
      if (entry.address.startsWith('169.254.')) continue;
      urls.add(`${protocol}://${entry.address}:${port}`);
    }
  }

  return Array.from(urls);
}

function shouldUseShell(command) {
  if (process.platform !== 'win32') return false;
  const normalized = String(command || '').toLowerCase();
  return normalized.endsWith('npm') || normalized.endsWith('npm.cmd');
}

function spawnLongRun(command, args, options = {}) {
  return spawn(command, args, {
    shell: shouldUseShell(command),
    stdio: 'inherit',
    ...options,
  });
}

function pipeAppLogs(childProcess, lanUrls) {
  let stdoutBuffer = '';
  let stderrBuffer = '';
  let announcedAdditionalUrls = false;
  const ansiRegex = /\u001b\[[0-9;]*m/g;
  const networkLineRegex = /^\s*-\s*Network:\s*https?:\/\/0\.0\.0\.0:\d+\s*$/i;

  const renderLine = (line, isStderr = false) => {
    const target = isStderr ? process.stderr : process.stdout;
    const plainLine = String(line || '').replace(ansiRegex, '');

    if (networkLineRegex.test(plainLine)) {
      const primary = lanUrls[0] || `${PROTOCOL}://localhost:${PORT}`;
      target.write(`   - Network:      ${primary}\n`);
      if (!announcedAdditionalUrls && lanUrls.length > 1) {
        announcedAdditionalUrls = true;
        target.write('[run:system] Additional LAN URLs:\n');
        for (const url of lanUrls.slice(1)) {
          target.write(`  - ${url}\n`);
        }
      }
      return;
    }

    target.write(`${line}\n`);
  };

  childProcess.stdout?.setEncoding('utf8');
  childProcess.stdout?.on('data', (chunk) => {
    stdoutBuffer += chunk;
    const lines = stdoutBuffer.split(/\r?\n/);
    stdoutBuffer = lines.pop() || '';
    for (const line of lines) renderLine(line, false);
  });

  childProcess.stderr?.setEncoding('utf8');
  childProcess.stderr?.on('data', (chunk) => {
    stderrBuffer += chunk;
    const lines = stderrBuffer.split(/\r?\n/);
    stderrBuffer = lines.pop() || '';
    for (const line of lines) renderLine(line, true);
  });

  childProcess.on('close', () => {
    if (stdoutBuffer) renderLine(stdoutBuffer, false);
    if (stderrBuffer) renderLine(stderrBuffer, true);
  });
}

function terminateProcessTree(pid) {
  if (!pid) return Promise.resolve();
  return new Promise((resolve) => {
    if (process.platform === 'win32') {
      const killer = spawn('taskkill', ['/PID', String(pid), '/T', '/F'], {
        stdio: 'ignore',
        shell: false,
      });
      killer.on('exit', () => resolve());
      killer.on('error', () => resolve());
      return;
    }

    try {
      process.kill(pid, 'SIGTERM');
    } catch {}
    resolve();
  });
}

async function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log('\n[run:system] Stopping system...');
  await terminateProcessTree(appProcess?.pid);
  process.exit(exitCode);
}

async function main() {
  process.on('SIGINT', () => void shutdown(0));
  process.on('SIGTERM', () => void shutdown(0));

  const lanUrls = getLanUrls(PORT, PROTOCOL);
  console.log(`[run:system] Starting DEV HTTPS on ${HOST}:${PORT}...`);

  appProcess = spawnLongRun(npmCmd, ['run', 'dev'], {
    stdio: ['inherit', 'pipe', 'pipe'],
  });
  pipeAppLogs(appProcess, lanUrls);

  appProcess.on('error', (error) => {
    if (!shuttingDown) {
      console.error(`[run:system] App process spawn error: ${error.message}`);
      void shutdown(1);
    }
  });

  appProcess.on('exit', (code) => {
    if (!shuttingDown) {
      console.error(`[run:system] App process exited unexpectedly with code ${code}.`);
      void shutdown(code || 1);
    }
  });

  console.log(`[run:system] Open on this machine: ${PROTOCOL}://localhost:${PORT}`);
  if (lanUrls.length > 0) {
    console.log('[run:system] Open from other devices in same LAN:');
    for (const url of lanUrls) {
      console.log(`  - ${url}`);
    }
  }
  console.log(`[run:system] NOTE: Do not open ${PROTOCOL}://0.0.0.0:${PORT} in browser.`);
}

main().catch(async (error) => {
  console.error('[run:system] Failed:', error instanceof Error ? error.message : error);
  await shutdown(1);
});
