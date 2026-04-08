import { NextRequest, NextResponse } from 'next/server';
import { dbRun } from '@/lib/database';

// POST /api/error-log - Log client-side errors
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, stack, componentStack, timestamp, userAgent, url } = body;

    // Lưu vào error_logs table (nếu cần thiết có thể tạo bảng riêng)
    // Tạm thời log vào audit_logs với action = 'client_error'
    await dbRun(
      `INSERT INTO audit_logs (actor_id, action, target_table, details, created_at)
       VALUES (NULL, 'client_error', 'error', ?, ?)`,
      [
        JSON.stringify({
          message,
          stack,
          componentStack,
          url,
          userAgent,
        }),
        timestamp || new Date().toISOString(),
      ]
    );

    return NextResponse.json({ logged: true }, { status: 201 });
  } catch (error) {
    console.error('Error logging failed:', error);
    // Don't throw - error logging shouldn't break the app
    return NextResponse.json({ logged: false }, { status: 500 });
  }
}
