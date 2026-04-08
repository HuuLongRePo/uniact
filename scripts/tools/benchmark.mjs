#!/usr/bin/env node

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const artilleryLookup = process.platform === "win32" ? "where.exe" : "which";
const artilleryCheck = spawnSync(artilleryLookup, ["artillery"], {
  stdio: "ignore",
});

const hasLoadTestConfig = existsSync(resolve("scripts/load-test.yml"));
const shouldRunLoadTest = process.argv.includes("--run");

console.log("Benchmark preflight:");
console.log(`- Cau hinh load test: ${hasLoadTestConfig ? "san sang" : "khong tim thay scripts/load-test.yml"}`);
console.log(`- Artillery: ${artilleryCheck.status === 0 ? "co san" : "chua cai hoac chua vao PATH"}`);

if (!shouldRunLoadTest) {
  console.log("");
  console.log("Mac dinh chi kiem tra san sang de tranh tao tai khong can thiet.");
  console.log("Neu muon chay load test that, dung: npm run benchmark -- --run");
  process.exit(0);
}

if (!hasLoadTestConfig || artilleryCheck.status !== 0) {
  console.error("Khong du dieu kien chay load test that.");
  process.exit(1);
}

const artilleryCommand = process.platform === "win32" ? "artillery.cmd" : "artillery";
const result = spawnSync(artilleryCommand, ["run", "scripts/load-test.yml"], {
  stdio: "inherit",
});

process.exit(result.status ?? 1);
