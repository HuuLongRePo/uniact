import { NextResponse } from 'next/server';

interface LegacyRouteOptions {
  route: string;
  replacement?: string;
  alternatives?: string[];
}

export function legacyReportRouteResponse({
  route,
  replacement,
  alternatives = [],
}: LegacyRouteOptions): NextResponse {
  const target = replacement
    ? `Hãy chuyển sang ${replacement}.`
    : 'Chưa có endpoint thay thế được duy trì cho luồng này.';

  const message = `Route ${route} là endpoint legacy và không còn tương thích schema hiện tại. ${target}`;

  return NextResponse.json(
    {
      success: false,
      message,
      error: message,
      code: 'LEGACY_ROUTE',
      legacy_route: route,
      ...(replacement ? { replacement } : {}),
      ...(alternatives.length > 0 ? { alternatives } : {}),
    },
    { status: 410 }
  );
}
