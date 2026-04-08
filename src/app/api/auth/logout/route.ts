import { successResponse } from '@/lib/api-response';
import { clearAuthCookie } from '@/lib/session-cookie';

// WHAT: API endpoint cho đăng xuất
// WHY: Clear authentication state
export async function POST() {
  // WHAT: Tạo response thành công
  const response = successResponse({}, 'Đăng xuất thành công');

  // WHAT: Xóa token cookie
  // WHY: Terminate user session
  clearAuthCookie(response);

  return response;
}
