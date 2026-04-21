const DEFAULT_JWT_SECRET = 'uniact-dev-only-key-change-for-production';

type JwtPayload = {
  userId: number;
  email: string;
  role: string;
};

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('CRITICAL: JWT_SECRET environment variable is required in production');
    }
    return DEFAULT_JWT_SECRET;
  }
  return secret;
}

function base64UrlDecode(value: string): Uint8Array {
  const padded = value.padEnd(value.length + ((4 - (value.length % 4)) % 4), '=');
  const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function utf8Decode(data: Uint8Array): string {
  return new TextDecoder().decode(data);
}

async function verifyHmacSha256(secret: string, payload: string, signature: Uint8Array): Promise<boolean> {
  const keyData = new TextEncoder().encode(secret);
  const key = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, [
    'verify',
  ]);
  return crypto.subtle.verify('HMAC', key, signature, new TextEncoder().encode(payload));
}

export async function verifyToken(token: string): Promise<JwtPayload> {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Token không hợp lệ');
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const headerJson = utf8Decode(base64UrlDecode(encodedHeader));

  let header: { alg?: string };
  try {
    header = JSON.parse(headerJson);
  } catch {
    throw new Error('Token không hợp lệ');
  }

  if (header.alg !== 'HS256') {
    throw new Error('Token không hợp lệ');
  }

  const signature = base64UrlDecode(encodedSignature);
  const payloadJson = utf8Decode(base64UrlDecode(encodedPayload));

  const valid = await verifyHmacSha256(getJwtSecret(), `${encodedHeader}.${encodedPayload}`, signature);
  if (!valid) {
    throw new Error('Token không hợp lệ');
  }

  let payload: JwtPayload;
  try {
    payload = JSON.parse(payloadJson);
  } catch {
    throw new Error('Token không hợp lệ');
  }

  if (!payload || typeof payload.userId !== 'number') {
    throw new Error('Token không hợp lệ');
  }

  return payload;
}
