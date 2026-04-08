/**
 * Content Security Policy Configuration
 * Chặn tải resources từ bên ngoài (external CDNs, fonts, scripts)
 * Cho phép kết nối local network để hỗ trợ mobile access
 */

// Get local network IPs for CSP (dev mode only)
// Supports multiple dev environments across different network IPs
const isDev = process.env.NODE_ENV === 'development';
const port = process.env.PORT || '3000';
const localNetworkHosts = isDev
  ? [
      `http://10.90.224.58:${port}`,
      `http://10.55.138.58:${port}`,
      `http://localhost:${port}`,
      `http://127.0.0.1:${port}`,
      `ws://10.90.224.58:${port}`,
      `ws://10.55.138.58:${port}`,
      `ws://localhost:${port}`,
      `ws://127.0.0.1:${port}`,
      // Explicit 3000/3001/3002 for various scenarios
      'http://10.90.224.58:3000',
      'http://10.90.224.58:3001',
      'http://10.90.224.58:3002',
      'http://10.55.138.58:3000',
      'http://10.55.138.58:3001',
      'http://10.55.138.58:3002',
      'ws://10.90.224.58:3000',
      'ws://10.90.224.58:3001',
      'ws://10.90.224.58:3002',
      'ws://10.55.138.58:3000',
      'ws://10.55.138.58:3001',
      'ws://10.55.138.58:3002',
    ].join(' ')
  : "'self'";

export const ContentSecurityPolicy = isDev
  ? // Development: permissive CSP for multiple IPs and localhost
    `
      default-src 'self' ${localNetworkHosts};
      script-src 'self' 'unsafe-eval' 'unsafe-inline' ${localNetworkHosts};
      style-src 'self' 'unsafe-inline' ${localNetworkHosts};
      img-src 'self' data: blob: ${localNetworkHosts};
      font-src 'self' data: ${localNetworkHosts};
      connect-src 'self' ${localNetworkHosts};
      media-src 'self' ${localNetworkHosts};
      object-src 'none';
      frame-src 'self';
      base-uri 'self';
      form-action 'self';
      frame-ancestors 'self';
    `
  : // Production: strict CSP
    `
      default-src 'self';
      script-src 'self' 'unsafe-eval' 'unsafe-inline';
      style-src 'self' 'unsafe-inline';
      img-src 'self' data: blob:;
      font-src 'self' data:;
      connect-src 'self';
      media-src 'self';
      object-src 'none';
      frame-src 'self';
      base-uri 'self';
      form-action 'self';
      frame-ancestors 'self';
    `;

export const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: ContentSecurityPolicy.replace(/\s{2,}/g, ' ').trim(),
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'off',
  },
  {
    key: 'X-Permitted-Cross-Domain-Policies',
    value: 'none',
  },
  {
    key: 'Cross-Origin-Opener-Policy',
    value: 'same-origin',
  },
  {
    key: 'Cross-Origin-Resource-Policy',
    value: 'same-origin',
  },
];
