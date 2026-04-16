#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const cleanNextArtifacts = 'rm -rf .next';
const coreLintTargets = 'src/app src/lib src/infrastructure';

const fullChecks = [
  { name: 'Format check', cmd: 'npm run format:check' },
  {
    name: 'Lint (core runtime)',
    cmd: `npx eslint ${coreLintTargets} --max-warnings=-1`,
  },
  {
    name: 'Type check (release config)',
    cmd: 'npx tsc --project tsconfig.release.json --noEmit --pretty false',
  },
  {
    name: 'Build',
    cmd: `${cleanNextArtifacts} && npm run build`,
  },
];

const fastChecks = [
  {
    name: 'Type check (release config)',
    cmd: 'npx tsc --project tsconfig.release.json --noEmit --pretty false',
  },
  { name: 'Build', cmd: 'npm run build' },
];

const modeArg = process.argv.find((arg) => arg.startsWith('--mode='));
const mode = modeArg?.split('=')[1] ?? 'full';
const checks = mode === 'fast' ? fastChecks : fullChecks;

if (!['full', 'fast'].includes(mode)) {
  console.error(`Invalid mode: ${mode}. Use --mode=full or --mode=fast`);
  process.exit(2);
}

console.log(`Running release checks in ${mode.toUpperCase()} mode`);

let failed = 0;

for (const check of checks) {
  console.log(`\n=== ${check.name} ===`);
  const result = spawnSync(check.cmd, {
    shell: true,
    stdio: 'inherit',
    env: process.env,
  });

  if (result.status !== 0) {
    failed += 1;
    console.error(`✖ ${check.name} failed (exit ${result.status ?? 'unknown'})`);
  } else {
    console.log(`✔ ${check.name} passed`);
  }
}

if (failed > 0) {
  console.error(`\nRelease check failed: ${failed}/${checks.length} checks failed.`);
  process.exit(1);
}

console.log(`\nRelease check passed: ${checks.length}/${checks.length} checks passed.`);
