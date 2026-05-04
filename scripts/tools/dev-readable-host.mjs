import { spawn } from 'node:child_process';
import { networkInterfaces } from 'node:os';

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const rawArgs = process.argv.slice(2);
const runArgs = ['run', 'dev:raw', '--', ...rawArgs];

let child = null;
let shuttingDown = false;

function getPrimaryLanAddress() {
  const interfaces = networkInterfaces();
  for (const entries of Object.values(interfaces)) {
    for (const entry of entries || []) {
      if (!entry || entry.family !== 'IPv4' || entry.internal) continue;
      if (entry.address.startsWith('169.254.')) continue;
      return entry.address;
    }
  }
  return null;
}

function replaceNetworkLine(line, lanIp) {
  const plain = String(line || '');
  const withoutAnsi = plain.replace(/\u001b\[[0-9;]*m/g, '');
  const networkMatch = withoutAnsi.match(/^(\s*-\s*Network:\s*)(https?):\/\/0\.0\.0\.0:(\d+)\s*$/i);
  if (!networkMatch) return null;

  const [, prefix, protocol, port] = networkMatch;
  const host = lanIp || 'localhost';
  return `${prefix}${protocol.toLowerCase()}://${host}:${port}`;
}

function resolvePort(args) {
  let port = '3000';
  for (let i = 0; i < args.length; i += 1) {
    const part = String(args[i] || '').trim();
    if (part === '-p' || part === '--port') {
      const next = String(args[i + 1] || '').trim();
      if (next) port = next;
      continue;
    }
    const shortMatch = part.match(/^-p(\d+)$/i);
    if (shortMatch) {
      port = shortMatch[1];
      continue;
    }
    const longMatch = part.match(/^--port=(\d+)$/i);
    if (longMatch) {
      port = longMatch[1];
    }
  }
  return port;
}

function safeWrite(stream, payload) {
  try {
    stream.write(payload);
    return true;
  } catch (error) {
    if (error && typeof error === 'object') {
      const code = Reflect.get(error, 'code');
      if (code === 'EPIPE' || code === 'ERR_STREAM_DESTROYED') {
        return false;
      }
    }
    throw error;
  }
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

async function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  await terminateProcessTree(child?.pid);
  process.exit(code);
}

function createStreamRewriter(target, lanIp) {
  let buffer = '';
  let closed = false;

  const flushLine = (line, delimiter = '') => {
    if (closed) return;
    const replaced = replaceNetworkLine(line, lanIp);
    const written = safeWrite(target, `${replaced ?? line}${delimiter}`);
    if (!written) {
      closed = true;
    }
  };

  const pushChunk = (chunk) => {
    if (closed) return;
    buffer += String(chunk ?? '');
    while (buffer.length > 0) {
      const lfIndex = buffer.indexOf('\n');
      const crIndex = buffer.indexOf('\r');
      let cutAt = -1;
      let delimiter = '';

      if (lfIndex === -1 && crIndex === -1) {
        break;
      }

      if (lfIndex !== -1 && (crIndex === -1 || lfIndex < crIndex)) {
        cutAt = lfIndex;
        delimiter = '\n';
      } else {
        cutAt = crIndex;
        delimiter = '\r';
        if (buffer[crIndex + 1] === '\n') {
          delimiter = '\r\n';
        }
      }

      const line = buffer.slice(0, cutAt);
      flushLine(line, delimiter);
      buffer = buffer.slice(cutAt + delimiter.length);
    }
  };

  const flushRemainder = () => {
    if (closed) return;
    if (!buffer) return;
    flushLine(buffer, '');
    buffer = '';
  };

  return { pushChunk, flushRemainder };
}

function pipeLogs(childProcess, lanIp) {
  const stdoutRewriter = createStreamRewriter(process.stdout, lanIp);
  const stderrRewriter = createStreamRewriter(process.stderr, lanIp);

  childProcess.stdout?.setEncoding('utf8');
  childProcess.stdout?.on('data', (chunk) => {
    stdoutRewriter.pushChunk(chunk);
  });

  childProcess.stderr?.setEncoding('utf8');
  childProcess.stderr?.on('data', (chunk) => {
    stderrRewriter.pushChunk(chunk);
  });

  childProcess.on('close', () => {
    stdoutRewriter.flushRemainder();
    stderrRewriter.flushRemainder();
  });
}

function shouldUseShell(command) {
  if (process.platform !== 'win32') return false;
  const normalized = String(command || '').toLowerCase();
  return normalized.endsWith('npm') || normalized.endsWith('npm.cmd');
}

function main() {
  const lanIp = getPrimaryLanAddress();
  const port = resolvePort(rawArgs);
  const host = lanIp || 'localhost';

  console.log(`[dev] Link mang: https://${host}:${port}`);

  child = spawn(npmCmd, runArgs, {
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: shouldUseShell(npmCmd),
  });

  pipeLogs(child, lanIp);

  process.on('SIGINT', () => void shutdown(0));
  process.on('SIGTERM', () => void shutdown(0));

  child.on('error', (error) => {
    console.error('[dev] Spawn error:', error.message);
    void shutdown(1);
  });

  child.on('exit', (code) => {
    if (!shuttingDown) {
      process.exit(code ?? 0);
    }
  });
}

main();
