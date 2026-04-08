export function logErrorToService(error: Error, errorInfo: any): void {
  console.error('Error:', error, errorInfo);
}
export function resetErrorBoundary(): void {
  if (typeof window !== 'undefined') {
    window.location.reload();
  }
}
