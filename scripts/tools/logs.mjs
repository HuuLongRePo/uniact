#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const candidates = [
  path.resolve("logs"),
  path.join(os.homedir(), ".pm2", "logs"),
];

const existingDirs = candidates.filter((dir) => fs.existsSync(dir) && fs.statSync(dir).isDirectory());

console.log("Nguon nhat ky kha dung:");

if (existingDirs.length === 0) {
  console.log("- Chua tim thay thu muc logs local hoac PM2 trong may nay.");
} else {
  for (const dir of existingDirs) {
    console.log(`- ${dir}`);
    const files = fs
      .readdirSync(dir)
      .filter((entry) => entry.endsWith(".log"))
      .sort();

    if (files.length === 0) {
      console.log("  (khong co file .log)");
      continue;
    }

    for (const file of files.slice(0, 10)) {
      console.log(`  - ${file}`);
    }
  }
}

console.log("");
console.log("Goi y xem log theo moi truong:");
console.log("- PowerShell local file: Get-Content -Wait .\\logs\\<ten-file>.log");
console.log("- PM2: pm2 logs uniact");
console.log("- Linux systemd: journalctl -u uniact -f");
