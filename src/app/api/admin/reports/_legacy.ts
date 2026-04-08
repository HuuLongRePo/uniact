import { NextResponse } from 'next/server';

interface LegacyAdminReportRouteOptions {
  route: string;
  replacement?: string;
  alternatives?: string[];
}

export function legacyAdminReportRouteResponse({
  route,
  replacement,
  alternatives = [],
}: LegacyAdminReportRouteOptions): NextResponse {
  const target = replacement
    ? `Hãy chuyển sang ${replacement}.`
    : 'Hiện chưa có endpoint thay thế được duy trì cho luồng này.';

  const message = `Route ${route} là endpoint legacy và không còn tương thích với cấu trúc báo cáo hiện tại. ${target}`;

  return NextResponse.json(
    {
      success: false,
      message,
      error: message,
      code: 'LEGACY_ADMIN_REPORT_ROUTE',
      legacy_route: route,
      ...(replacement ? { replacement } : {}),
      ...(alternatives.length > 0 ? { alternatives } : {}),
    },
    { status: 410 }
  );
}
