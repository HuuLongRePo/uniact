import { expect } from 'vitest';

// Common mojibake glyphs observed in UTF-8/legacy decoding issues.
export const MOJIBAKE_CHAR_PATTERN = /[\u00C2\u00C3\u00C4\u00C6\u00E2\u0192\u201A\u00A2]/u;

export function expectNoMojibake(value: string): void {
  expect(value).not.toMatch(MOJIBAKE_CHAR_PATTERN);
}
