#!/usr/bin/env node

const rawTarget =
  process.argv[2] || process.env.HEALTHCHECK_URL || process.env.BASE_URL || "http://localhost:3000";

const healthUrl = rawTarget.includes("/api/health")
  ? rawTarget
  : new URL("/api/health", rawTarget).toString();

try {
  const response = await fetch(healthUrl, {
    headers: {
      Accept: "application/json",
    },
  });

  const text = await response.text();
  let payload = null;

  try {
    payload = JSON.parse(text);
  } catch {
    payload = null;
  }

  if (!response.ok) {
    console.error(`Health check thất bại (${response.status}) tại ${healthUrl}`);
    console.error(payload ? JSON.stringify(payload, null, 2) : text);
    process.exit(1);
  }

  if (payload) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log(text);
  }
} catch (error) {
  console.error(`Không thể kết nối health endpoint ${healthUrl}`);
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
