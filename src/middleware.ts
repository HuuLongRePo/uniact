import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware:
 * 1. Chặn các request ra ngoài mạng nội bộ (LAN-only)
 * 2. Bảo vệ các route yêu cầu xác thực (auth guard)
 */

const ALLOWED_HOSTS = [
  'localhost',
  '127.0.0.1',
  '::1',
  '0.0.0.0', // allow dev binding host
];

// Protected routes yêu cầu authentication
const PROTECTED_ROUTES = ['/admin', '/teacher', '/student'];

// Cho phép các dải IP private
function isPrivateIP(hostname: string): boolean {
  const ipRegex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = hostname.match(ipRegex);

  if (!match) return false;

  const [, a, b] = match.map(Number);

  // 10.0.0.0/8
  if (a === 10) return true;

  // 172.16.0.0/12
  if (a === 172 && b >= 16 && b <= 31) return true;

  // 192.168.0.0/16
  if (a === 192 && b === 168) return true;

  // 169.254.0.0/16 (link-local)
  if (a === 169 && b === 254) return true;

  return false;
}

export function middleware(request: NextRequest) {
  const hostname = request.nextUrl.hostname;
  const pathname = request.nextUrl.pathname;

  // Log tất cả request khi dev
  if (process.env.NODE_ENV === 'development') {
    console.warn(`📡 Yêu cầu: ${request.method} ${request.url}`);
  }

  // 1. Check if hostname is allowed (LAN-only protection)
  const isAllowed =
    ALLOWED_HOSTS.includes(hostname) || isPrivateIP(hostname) || hostname.endsWith('.local');

  if (!isAllowed) {
    console.error(`🚫 CHẶN: Yêu cầu tới host bên ngoài: ${hostname}`);
    return NextResponse.json(
      {
        error: 'EXTERNAL_REQUEST_BLOCKED',
        message:
          'Hệ thống này thiết kế để sử dụng trong LAN/offline. Không cho phép request ra ngoài.',
        hostname,
      },
      { status: 403 }
    );
  }

  // 2. Check authentication for protected routes
  const isProtectedRoute = PROTECTED_ROUTES.some((route) => pathname.startsWith(route));

  if (isProtectedRoute) {
    // Check if user has auth token (cookie)
    const token = request.cookies.get('token');

    if (!token) {
      console.warn(`🔒 Chặn truy cập không xác thực: ${pathname}`);
      // Redirect to login page
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

// Cấu hình các route áp dụng middleware
export const config = {
  matcher: [
    /*
     * Match tất cả request trừ:
     * - _next/static (file tĩnh)
     * - _next/image (tối ưu ảnh)
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
