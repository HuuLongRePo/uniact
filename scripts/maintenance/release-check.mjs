#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';

const coreLintTargets = 'src/app src/lib src/infrastructure';

function cleanNextArtifacts() {
  rmSync('.next', { recursive: true, force: true });
}

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
    beforeRun: cleanNextArtifacts,
    cmd: 'npm run build',
  },
];

const rcChecks = [
  {
    name: 'Type check (release config)',
    cmd: 'npx tsc --project tsconfig.release.json --noEmit --pretty false',
  },
  {
    name: 'Production build',
    beforeRun: cleanNextArtifacts,
    cmd: 'npm run production:build',
  },
  {
    name: 'Backbone regression',
    cmd: 'npm run test:backbone',
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
const mode = modeArg?.split('=')[1] ?? 'rc';
const checksByMode = {
  full: fullChecks,
  rc: rcChecks,
  fast: fastChecks,
};
const checks = checksByMode[mode];

if (!['full', 'rc', 'fast'].includes(mode)) {
  console.error(`Invalid mode: ${mode}. Use --mode=full, --mode=rc or --mode=fast`);
  process.exit(2);
}

console.log(`Running release checks in ${mode.toUpperCase()} mode`);

let failed = 0;

for (const check of checks) {
  console.log(`\n=== ${check.name} ===`);
  if (typeof check.beforeRun === 'function') {
    check.beforeRun();
  }
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
