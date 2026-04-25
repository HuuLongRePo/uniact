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
    ? `Hay chuyen sang ${replacement}.`
    : 'Chua co endpoint thay the duoc duy tri cho luong nay.';

  const message = `Route ${route} la endpoint legacy va khong con tuong thich schema hien tai. ${target}`;

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

