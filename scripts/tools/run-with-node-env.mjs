#!/usr/bin/env node

import { spawn } from "node:child_process";

const [, , nodeEnv, npmScript, ...extraArgs] = process.argv;

if (!nodeEnv || !npmScript) {
  console.error(
    "Cach dung: node scripts/tools/run-with-node-env.mjs <NODE_ENV> <npm-script> [args...]",
  );
  process.exit(1);
}

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const npmArgs = ["run", npmScript];

if (extraArgs.length > 0) {
  npmArgs.push("--", ...extraArgs);
}

const child = spawn(process.platform === "win32" ? `${npmCommand} ${npmArgs.join(" ")}` : npmCommand, process.platform === "win32" ? {
  stdio: "inherit",
  shell: true,
  env: {
    ...process.env,
    NODE_ENV: nodeEnv,
  },
} : {
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_ENV: nodeEnv,
  },
});

child.on("error", (error) => {
  console.error(`Khong the chay npm script '${npmScript}': ${error.message}`);
  process.exit(1);
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
