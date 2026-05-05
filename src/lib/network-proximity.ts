import { NextRequest } from 'next/server';

function stripPort(rawIp: string): string {
  const value = rawIp.trim();
  if (!value) return '';

  // IPv6 literals may contain multiple colons. Only strip port for IPv4.
  if (value.includes(':') && value.includes('.')) {
    const [host] = value.split(':');
    return host || value;
  }

  return value;
}

export function extractClientIp(request: NextRequest): string | null {
  const candidates = [
    request.headers.get('cf-connecting-ip'),
    request.headers.get('x-real-ip'),
    request.headers.get('x-forwarded-for')?.split(',')[0] ?? null,
  ];

  for (const item of candidates) {
    const ip = stripPort(String(item || ''));
    if (ip) {
      return ip;
    }
  }

  return null;
}

export function toNetworkPrefix(ip: string | null): string | null {
  if (!ip) return null;
  const value = ip.trim().toLowerCase();
  if (!value) return null;

  // IPv4 -> /24 prefix (first 3 octets)
  if (value.includes('.')) {
    const parts = value.split('.');
    if (parts.length !== 4) return null;
    const octets = parts.map((part) => Number(part));
    if (octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) return null;
    return `${octets[0]}.${octets[1]}.${octets[2]}`;
  }

  // IPv6 -> /64 coarse prefix (first 4 hextets)
  const sanitized = value.split('%')[0];
  const hextets = sanitized.split(':').filter(Boolean);
  if (hextets.length < 4) return null;
  return hextets.slice(0, 4).join(':');
}

export function resolveRequestNetworkPrefix(request: NextRequest): string | null {
  return toNetworkPrefix(extractClientIp(request));
}
