import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const testDir = join(root, 'test');
const missing = [];

function walk(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    if (!entry.isFile()) continue;
    if (!/^student-.*\.test\.tsx?$/.test(entry.name)) continue;

    const text = readFileSync(full, 'utf8');
    if (!text.includes("vi.mock('next/navigation'")) continue;
    if (text.includes('usePathname')) continue;
    missing.push(full);
  }
}

function toRelative(p) {
  const normalizedRoot = root.replace(/\\/g, '/');
  const normalizedPath = p.replace(/\\/g, '/');
  if (normalizedPath.startsWith(`${normalizedRoot}/`)) {
    return normalizedPath.slice(normalizedRoot.length + 1);
  }
  return normalizedPath;
}

function main() {
  const start = Date.now();
  if (!statSync(testDir).isDirectory()) {
    console.error('[audit:student-navigation-mocks] Missing test directory:', testDir);
    process.exit(1);
  }

  walk(testDir);

  if (missing.length === 0) {
    console.log('[audit:student-navigation-mocks] PASS: all student next/navigation mocks include usePathname.');
    return;
  }

  console.error(
    `[audit:student-navigation-mocks] FAIL: found ${missing.length} student test files missing usePathname:`
  );
  for (const file of missing) {
    console.error(`- ${toRelative(file)}`);
  }
  const elapsed = Date.now() - start;
  console.error(`[audit:student-navigation-mocks] Completed in ${elapsed}ms.`);
  process.exit(1);
}

main();
