import { describe, expect, it } from 'vitest';
import { securityHeaders } from '../src/lib/security-headers';

describe('security headers', () => {
  it('allows camera for same-origin pages used by QR and biometric flows', () => {
    const permissionsPolicy = securityHeaders.find((header) => header.key === 'Permissions-Policy');

    expect(permissionsPolicy).toBeTruthy();
    expect(permissionsPolicy?.value).toContain('camera=(self)');
    expect(permissionsPolicy?.value).not.toContain('camera=()');
  });
});
