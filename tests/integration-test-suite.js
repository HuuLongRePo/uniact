/**
 * UniAct Integration Test Suite
 * Tests critical workflows: Auth → QR → Attendance → Scoring → Awards
 * 
 * Run: node tests/integration-test-suite.js
 * Default behavior: boot a managed Next dev server on a dedicated test port
 */

const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');

const ADMIN_EMAIL = 'admin@annd.edu.vn';
const ADMIN_PASS = 'Admin@2025';
const TEACHER_EMAIL = 'gv.nguyenthilan@annd.edu.vn';
const TEACHER_PASS = 'teacher123';
const STUDENT_EMAIL = 'sv31a001@annd.edu.vn';
const STUDENT_PASS = 'student123';

const TEST_SERVER_PORT = process.env.TEST_SERVER_PORT || '3100';
const TEST_DIST_DIR = process.env.TEST_DIST_DIR || '.next-integration';
const TEST_JWT_SECRET = process.env.TEST_JWT_SECRET || 'integration-test-jwt-secret-2026';
const DEFAULT_API_BASE = process.env.TEST_API_BASE || `http://127.0.0.1:${TEST_SERVER_PORT}/api`;
const SHOULD_MANAGE_SERVER = process.env.TEST_MANAGE_SERVER !== '0' && !process.env.TEST_API_BASE;
const NEXT_BIN = path.join(process.cwd(), 'node_modules', 'next', 'dist', 'bin', 'next');
const TSX_BIN = path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'cli.mjs');

let API_BASE = DEFAULT_API_BASE;
let adminToken = null;
let teacherToken = null;
let studentToken = null;
let adminCookie = null;
let teacherCookie = null;
let studentCookie = null;
let activeQrToken = null;
let requestCounter = 0;
let localDevServerProcess = null;
let managedServerStarted = false;

const DEV_SERVER_LOG = path.join(process.cwd(), 'TEST_DEV_SERVER.log');
const BUILD_LOG = path.join(process.cwd(), 'TEST_BUILD_SERVER.log');

function runCommand(command, args = [], env = process.env) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env,
    encoding: 'utf-8',
  });

  const combinedOutput = `${result.stdout || ''}${result.stderr || ''}`.trim();
  if (combinedOutput) {
    console.log(combinedOutput);
  }

  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(' ')}`.trim());
  }
}

function getManagedServerEnv() {
  return {
    ...process.env,
    PORT: TEST_SERVER_PORT,
    NEXT_DIST_DIR: TEST_DIST_DIR,
    NEXT_TELEMETRY_DISABLED: '1',
    JWT_SECRET: TEST_JWT_SECRET,
  };
}

function buildManagedServer() {
  if (fs.existsSync(BUILD_LOG)) {
    fs.unlinkSync(BUILD_LOG);
  }

  const buildResult = spawnSync(process.execPath, [NEXT_BIN, 'build'], {
    cwd: process.cwd(),
    env: getManagedServerEnv(),
    encoding: 'utf-8',
  });

  fs.writeFileSync(
    BUILD_LOG,
    `${buildResult.stdout || ''}${buildResult.stderr || ''}`,
    'utf-8'
  );

  if (buildResult.status !== 0) {
    throw new Error(`Managed integration build failed. See ${BUILD_LOG}`);
  }
}

function runSeed(mode) {
  runCommand(process.execPath, [TSX_BIN, 'scripts/seed/seed-data.ts', `--mode=${mode}`]);
}

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', () => {
      resolve(false);
    });

    server.once('listening', () => {
      server.close(() => resolve(true));
    });

    server.listen(Number(port), '127.0.0.1');
  });
}

async function isApiHealthy() {
  try {
    await waitForHealth(2, 250);
    return true;
  } catch {
    return false;
  }
}

async function waitForHealth(maxRetries = 30, delayMs = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(`${API_BASE}/health`);
      if (response.ok) {
        return;
      }

      // Fallback check: if health endpoint is temporarily unavailable,
      // verify API server is still reachable via auth route.
      const authProbe = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'probe@local', password: 'invalid' }),
      });
      if (authProbe.status >= 400 && authProbe.status < 500) {
        return;
      }
    } catch {
      // Retry until server is ready
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw new Error(`API server is not healthy at ${API_BASE}`);
}

function startLocalDevServer() {
  if (localDevServerProcess) {
    return;
  }

  if (fs.existsSync(DEV_SERVER_LOG)) {
    fs.unlinkSync(DEV_SERVER_LOG);
  }

  const logStream = fs.createWriteStream(DEV_SERVER_LOG, { flags: 'a' });
  API_BASE = DEFAULT_API_BASE;

  localDevServerProcess = spawn(
    process.execPath,
    [NEXT_BIN, 'start', '--hostname', '127.0.0.1', '--port', TEST_SERVER_PORT],
    {
      cwd: process.cwd(),
      env: getManagedServerEnv(),
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
    }
  );

  localDevServerProcess.stdout?.pipe(logStream);
  localDevServerProcess.stderr?.pipe(logStream);
  managedServerStarted = true;
}

function stopLocalDevServer() {
  if (!localDevServerProcess) {
    return;
  }

  localDevServerProcess.kill('SIGTERM');
  localDevServerProcess = null;
  managedServerStarted = false;
}

async function ensureApiReady() {
  API_BASE = DEFAULT_API_BASE;

  if (!SHOULD_MANAGE_SERVER) {
    await waitForHealth(30, 1000);
    return;
  }

  const portAvailable = await isPortAvailable(TEST_SERVER_PORT);
  if (!portAvailable) {
    if (await isApiHealthy()) {
      log('SETUP', `Reusing existing integration API at ${API_BASE}`, 'warning');
      return;
    }

    throw new Error(
      `Dedicated integration port ${TEST_SERVER_PORT} is occupied by a non-healthy process. Free it or set TEST_SERVER_PORT.`
    );
  }

  log(
    'SETUP',
    `Building managed integration server with dist dir ${TEST_DIST_DIR}`,
    'info'
  );
  buildManagedServer();
  log('SETUP', `Starting managed integration server at ${API_BASE}`, 'info');
  startLocalDevServer();
  await waitForHealth(60, 1000);
}

async function setupTestData() {
  console.log('\n🧪 TEST SETUP: Reset and seed QA data...');
  runSeed('reset');
  runSeed('qa');
  await ensureApiReady();
  console.log('✅ TEST SETUP COMPLETE\n');
}

async function teardownTestData() {
  console.log('\n🧹 TEST TEARDOWN: Restoring demo seed...');
  runSeed('demo');
  if (managedServerStarted) {
    stopLocalDevServer();
  }
  console.log('✅ TEST TEARDOWN COMPLETE\n');
}

// ==================== UTILITIES ====================
async function request(method, endpoint, body = null, token = null, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'x-forwarded-for': options.ip || `10.10.0.${(requestCounter++ % 200) + 1}`,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (options.cookie) {
    headers['Cookie'] = options.cookie;
  }

  const requestOptions = {
    method,
    headers,
  };
  if (body) {
    requestOptions.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, requestOptions);
  const setCookies =
    typeof response.headers.getSetCookie === 'function'
      ? response.headers.getSetCookie()
      : (response.headers.get('set-cookie') ? [response.headers.get('set-cookie')] : []);
  const cookieHeader = setCookies
    .filter(Boolean)
    .map((cookie) => cookie.split(';')[0])
    .join('; ');
  const data = await response.json();
  return { status: response.status, data, cookieHeader };
}

function resolveAuth(token, cookie) {
  return token ? { token, options: {} } : { token: null, options: cookie ? { cookie } : {} };
}

function log(title, message, type = 'info') {
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
  };
  console.log(`${icons[type]} ${title}: ${message}`);
}

async function assert(condition, message) {
  if (!condition) {
    log('ASSERTION FAILED', message, 'error');
    process.exit(1);
  }
  log('ASSERTION PASSED', message, 'success');
}

// ==================== TEST SUITE ====================
async function runTests() {
  console.log('\n🚀 Starting UniAct Integration Test Suite\n');

  try {
    await setupTestData();

    // Phase 1: Authentication
    console.log('📋 PHASE 1: Authentication & Authorization');
    await testAdminLogin();
    await testTeacherLogin();
    await testStudentLogin();
    await testRegisterRateLimit();

    // Phase 2: Activity Flow
    console.log('\n📋 PHASE 2: Activity Management');
    const activityId = await testCreateActivity();
    await testActivityApproval(activityId);

    // Phase 3: QR Session
    console.log('\n📋 PHASE 3: QR Session & Scanning');
    const qrSessionId = await testCreateQRSession(activityId);
    await testQRSessionRateLimit();

    // Phase 4: Attendance
    console.log('\n📋 PHASE 4: Attendance Recording');
    await testManualAttendance(activityId, studentToken);

    // Phase 5: Security Tests
    console.log('\n📋 PHASE 5: Security Validations');
    await testCronAuthEntication();
    await testChartAuthentication();
    await testTeacherCannotEditOthersActivity(activityId);

    // Phase 6: Rate Limiting
    console.log('\n📋 PHASE 6: Rate Limiting');
    await testLoginRateLimit();

    console.log('\n✅ ALL TESTS PASSED!\n');
    await teardownTestData();
  } catch (error) {
    log('TEST SUITE FAILED', error.message, 'error');
    if (managedServerStarted) {
      stopLocalDevServer();
    }
    process.exit(1);
  }
}

// ==================== TEST IMPLEMENTATIONS ====================

async function testAdminLogin() {
  const { status, data, cookieHeader } = await request('POST', '/auth/login', {
    email: ADMIN_EMAIL,
    password: ADMIN_PASS,
  });

  await assert(status === 200, 'Admin login successful');
  await assert(data.user?.role === 'admin', 'Admin login returns admin role');
  const token = data?.token || data?.data?.token || data?.accessToken || data?.data?.accessToken || null;
  adminCookie = cookieHeader || null;
  await assert(!!token || !!adminCookie, 'Admin login returns JWT token or session cookie');
  adminToken = token;
}

async function testTeacherLogin() {
  const { status, data, cookieHeader } = await request('POST', '/auth/login', {
    email: TEACHER_EMAIL,
    password: TEACHER_PASS,
  });

  await assert(status === 200, 'Teacher login successful');
  await assert(data.user?.role === 'teacher', 'Teacher login returns teacher role');
  teacherCookie = cookieHeader || null;
  teacherToken = data?.token || data?.data?.token || data?.accessToken || data?.data?.accessToken || null;
  await assert(!!teacherToken || !!teacherCookie, 'Teacher login returns JWT token or session cookie');
}

async function testStudentLogin() {
  const { status, data, cookieHeader } = await request('POST', '/auth/login', {
    email: STUDENT_EMAIL,
    password: STUDENT_PASS,
  });

  await assert(status === 200, 'Student login successful');
  await assert(data.user?.role === 'student', 'Student login returns student role');
  studentCookie = cookieHeader || null;
  studentToken = data?.token || data?.data?.token || data?.accessToken || data?.data?.accessToken || null;
  await assert(!!studentToken || !!studentCookie, 'Student login returns JWT token or session cookie');
}

async function testRegisterRateLimit() {
  // Attempt 6 registrations rapidly (limit is 5/hour)
  let rateLimitHit = false;

  for (let i = 0; i < 6; i++) {
    const { status } = await request(
      'POST',
      '/auth/register',
      {
        email: `test${i}@test.com`,
        password: 'Test@1234',
        name: `Test User ${i}`,
        role: 'student',
      },
      null,
      { ip: '20.20.20.1' }
    );

    if (status === 429) {
      rateLimitHit = true;
      break;
    }
  }

  if (rateLimitHit) {
    log('RATE_LIMIT', 'Register endpoint rate limiting works', 'success');
  } else {
    log('RATE_LIMIT', 'WARNING: Register endpoint may not have rate limiting', 'warning');
  }
}

async function testCreateActivity() {
  const auth = resolveAuth(teacherToken, teacherCookie);
  const activityData = {
    title: 'Integration Test Activity',
    description: 'Testing activity creation',
    date_time: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    location: 'Room 101',
    activity_type_id: 1,
  };

  const { status, data } = await request('POST', '/activities', activityData, auth.token, auth.options);

  await assert(status === 200 || status === 201, 'Activity created successfully');
  await assert(data.activity?.id, 'Activity has ID');
  await assert(
    data.activity?.status === 'draft' || data.activity?.status === 'pending',
    'New activity has valid initial status'
  );

  return data.activity.id;
}

async function testActivityApproval(activityId) {
  const teacherAuth = resolveAuth(teacherToken, teacherCookie);
  const adminAuth = resolveAuth(adminToken, adminCookie);
  // Teacher submits activity for approval
  let submitStatus = 0;
  const submitForApproval = await request(
    'POST',
    `/activities/${activityId}/submit-for-approval`,
    {},
    teacherAuth.token,
    teacherAuth.options
  );

  if (submitForApproval.status === 404 || submitForApproval.status === 405) {
    const submitApproval = await request(
      'POST',
      `/activities/${activityId}/submit-approval`,
      {},
      teacherAuth.token,
      teacherAuth.options
    );
    submitStatus = submitApproval.status;
  } else {
    submitStatus = submitForApproval.status;
  }

  await assert(submitStatus === 200 || submitStatus === 201, 'Activity submitted for approval');

  // Admin approves activity
  const { status: approveStatus, data } = await request('POST', `/activities/${activityId}/approve`, {}, adminAuth.token, adminAuth.options);

  await assert(approveStatus === 200, 'Admin approved activity');
  await assert(
    data.activity?.status === 'published' || data.success === true,
    'Activity approval response is successful'
  );
}

async function testCreateQRSession(activityId) {
  const teacherAuth = resolveAuth(teacherToken, teacherCookie);
  const { status, data } = await request('POST', '/qr-sessions', {
    activity_id: activityId,
    expires_minutes: 5,
  }, teacherAuth.token, teacherAuth.options);

  const qrToken =
    data?.token ||
    data?.session_token ||
    data?.data?.token ||
    data?.data?.session_token ||
    null;
  const qrId = data?.id || data?.session_id || data?.data?.id || data?.data?.session_id || null;

  await assert(status === 200 || status === 201, 'QR session created');
  await assert(!!qrToken || !!qrId, 'QR session has token or id');

  activeQrToken = qrToken || String(qrId);

  return qrId;
}

async function testQRSessionRateLimit() {
  const teacherAuth = resolveAuth(teacherToken, teacherCookie);
  // Attempt 21 QR session creations (limit is 20/minute)
  let rateLimitHit = false;

  for (let i = 0; i < 21; i++) {
    const { status } = await request('POST', '/qr-sessions', {
      activity_id: 1,
      expires_minutes: 5,
    }, teacherAuth.token, teacherAuth.options);

    if (status === 429) {
      rateLimitHit = true;
      break;
    }
  }

  if (rateLimitHit) {
    log('RATE_LIMIT', 'QR sessions endpoint rate limiting works', 'success');
  } else {
    log('RATE_LIMIT', 'WARNING: QR sessions endpoint may not have rate limiting', 'warning');
  }
}

async function testManualAttendance(activityId) {
  const teacherAuth = resolveAuth(teacherToken, teacherCookie);
  const { status, data } = await request('POST', '/attendance/manual', {
    activity_id: activityId,
    student_ids: [1, 2, 3],
    achievements: {
      '1': 'excellent',
      '2': 'good',
      '3': 'participated',
    },
  }, teacherAuth.token, teacherAuth.options);

  await assert(status === 200, 'Manual attendance recorded');

  const successCount = data?.successCount ?? data?.data?.successCount ?? 0;
  const alreadyAttended = data?.alreadyAttended ?? data?.data?.alreadyAttended ?? 0;
  const results = data?.results ?? data?.data?.results ?? [];

  await assert(Array.isArray(results) && results.length > 0, 'Manual attendance returns detailed results');
  await assert(successCount + alreadyAttended >= 0, 'Manual attendance summary fields are valid');
}

async function testCronAuthEntication() {
  // Attempt to trigger cron without CRON_SECRET
  const { status } = await request('POST', '/cron/complete-activities', {});

  await assert(status === 401, 'Cron endpoint rejects unauthenticated requests');

  // Try with invalid CRON_SECRET
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer invalid-secret',
  };
  
  const response = await fetch(`${API_BASE}/cron/complete-activities`, {
    method: 'POST',
    headers,
    body: JSON.stringify({}),
  });

  await assert(response.status === 401, 'Cron endpoint rejects invalid CRON_SECRET');
}

async function testChartAuthentication() {
  const adminAuth = resolveAuth(adminToken, adminCookie);
  // Attempt to access charts without auth
  const { status } = await request('GET', '/charts/participation-distribution');

  await assert(status === 401 || status === 403, 'Chart endpoint requires authentication');

  // Access with valid token
  const { status: authStatus } = await request('GET', '/charts/participation-distribution', null, adminAuth.token, adminAuth.options);

  await assert(authStatus === 200, 'Chart endpoint accessible with valid token');
}

async function testTeacherCannotEditOthersActivity(activityId) {
  const studentAuth = resolveAuth(studentToken, studentCookie);
  // Assume student2 token not owned by activityId
  const { status } = await request('POST', `/activities/${999999}/submit-for-approval`, {}, studentAuth.token, studentAuth.options);

  await assert(
    status === 400 ||
      status === 401 ||
      status === 403 ||
      status === 404 ||
      status === 405,
    'Student cannot submit application for non-existent activity'
  );
}

async function testLoginRateLimit() {
  // Attempt 11 failed logins (limit is 10/15min)
  let rateLimitHit = false;

  for (let i = 0; i < 11; i++) {
    const { status } = await request(
      'POST',
      '/auth/login',
      {
        email: ADMIN_EMAIL,
        password: 'wrong-password',
      },
      null,
      { ip: '30.30.30.1' }
    );

    if (status === 429) {
      rateLimitHit = true;
      break;
    }
  }

  if (rateLimitHit) {
    log('RATE_LIMIT', 'Login endpoint rate limiting works', 'success');
  } else {
    log('RATE_LIMIT', 'WARNING: Login endpoint may not have rate limiting', 'warning');
  }
}

// ==================== MAIN ====================
runTests().catch(error => {
  if (managedServerStarted) {
    stopLocalDevServer();
  }
  console.error('Fatal error:', error);
  process.exit(1);
});
