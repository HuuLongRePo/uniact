#!/usr/bin/env node

import os from "node:os";

const formatBytes = (value) => {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = value;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`;
};

const cpus = os.cpus();
const primaryCpu = cpus[0];

const info = {
  hostname: os.hostname(),
  platform: `${os.platform()} ${os.release()}`,
  arch: os.arch(),
  node: process.version,
  cpu_model: primaryCpu?.model ?? "Không xác định",
  cpu_cores: cpus.length,
  total_memory: formatBytes(os.totalmem()),
  free_memory: formatBytes(os.freemem()),
  uptime_seconds: os.uptime(),
  cwd: process.cwd(),
};

console.log(JSON.stringify(info, null, 2));
