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
    ? `Hay chuyen sang ${replacement}.`
    : 'Hien chua co endpoint thay the duoc duy tri cho luong nay.';

  const message = `Route ${route} la endpoint legacy va khong con tuong thich voi cau truc bao cao hien tai. ${target}`;

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

