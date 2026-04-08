export function isHydratingMismatch(error: Error): boolean {
  return error?.message?.includes?.('Hydration') || false;
}
