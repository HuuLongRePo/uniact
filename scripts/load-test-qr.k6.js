/**
 * K6 Load Testing Script: QR Attendance Validation
 * 
 * Giả lập 50 sinh viên gửi request điểm danh QR đồng thời trong 1 phút
 * - 50 virtual users (VUs)
 * - Duration: 60 seconds (1 phút)
 * - Request: POST /api/attendance/validate
 * - Headers: JWT token + Content-Type
 * - Body: QR token ngẫu nhiên
 * 
 * Chạy: k6 run scripts/load-test-qr.k6.js
 * Hoặc: k6 run -u 50 -d 60s scripts/load-test-qr.k6.js
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const validationDuration = new Trend('validation_duration');
const successCounter = new Counter('successful_validations');
const activeUsers = new Gauge('active_users');

// Configuration: Adjust này based on test needs
export const options = {
  stages: [
    { duration: '10s', target: 50 },   // Ramp-up: 0 → 50 users
    { duration: '40s', target: 50 },   // Stay: 50 users
    { duration: '10s', target: 0 },    // Ramp-down: 50 → 0 users
  ],
  thresholds: {
    'http_req_duration': ['p(99)<500', 'p(95)<300'],  // p99 < 500ms, p95 < 300ms
    'http_req_failed': ['rate<0.05'],                  // Error rate < 5%
    'validation_duration': ['p(99)<500'],
  },
};

/**
 * Sinh ra JWT token giả (thực tế sẽ được lấy từ login trước)
 * Mẫu: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 */
function generateMockJWT(studentId) {
  // Header
  const header = btoa(JSON.stringify({
    alg: 'HS256',
    typ: 'JWT'
  }));

  // Payload (mock)
  const payload = btoa(JSON.stringify({
    userId: studentId,
    email: `student${String(studentId).padStart(2, '0')}@test.edu`,
    role: 'student',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600  // 1 hour validity
  }));

  // Signature (fake for testing - should be actual HMAC-SHA256 in production)
  const signature = btoa('mock_signature_' + studentId);

  return `${header}.${payload}.${signature}`;
}

/**
 * Random QR token generator
 * Mẫu token: qr_session_<random>_<timestamp>
 */
function generateRandomQRToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = 'qr_session_';
  
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  token += '_' + Date.now();
  return token;
}

/**
 * Setup: Run once trước tất cả users
 * - Register dummy user / get JWT token nếu cần
 */
export function setup() {
  console.log('📋 K6 Load Test Setup Started');
  
  // Optional: Truy vấn API để lấy JWT token thực từ account test
  let jwtToken = null;
  
  try {
    const loginRes = http.post('http://localhost:3000/api/auth/login', JSON.stringify({
      email: 'student01@test.edu',
      password: 'Student123!'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

    if (loginRes.status === 200) {
      const body = JSON.parse(loginRes.body);
      jwtToken = body.data?.token;
      console.log('✅ JWT token retrieved from server');
    }
  } catch (e) {
    console.log('⚠️ Could not retrieve JWT from server, using mock tokens');
  }

  return { jwtToken };
}

/**
 * Main test function - Runs once per VU per iteration
 */
export default function (data) {
  const studentId = __VU;  // k6 variable: Virtual User ID
  activeUsers.add(1);

  // Lấy JWT token (thực hoặc mock)
  const jwtToken = data?.jwtToken || generateMockJWT(studentId);
  const qrToken = generateRandomQRToken();

  // Prepare request
  const url = 'http://localhost:3000/api/attendance/validate';
  const payload = JSON.stringify({
    qr_token: qrToken,
    student_id: studentId,
    timestamp: new Date().toISOString()
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwtToken}`,
      'User-Agent': `k6/LoadTest VU-${studentId}`
    },
    tags: {
      name: 'QRAttendanceValidation',
      group: 'Attendance',
    }
  };

  // Execute request
  group('QR Attendance Flow', () => {
    const startTime = Date.now();
    
    const res = http.post(url, payload, params);
    
    const duration = Date.now() - startTime;
    validationDuration.add(duration);

    // Success check
    const success = check(res, {
      'status is 200 or 201': (r) => r.status === 200 || r.status === 201,
      'response has data': (r) => r.body && r.body.length > 0,
      'no timeout': (r) => r.timings.duration < 5000,
      'response time < 500ms': (r) => r.timings.duration < 500,
    });

    if (success) {
      successCounter.add(1);
    } else {
      errorRate.add(1, { status: res.status });
      console.error(`❌ VU-${studentId}: Status ${res.status}, Body: ${res.body}`);
    }

    // Simulate think time (0.5-2 seconds random)
    sleep(Math.random() * 1.5 + 0.5);
  });

  activeUsers.add(-1);
}

/**
 * Teardown: Run once sau tất cả users hoàn thành
 */
export function teardown(data) {
  console.log('📊 Load Test Completed');
  console.log(`Total Successful: ${successCounter.value || 0}`);
}
