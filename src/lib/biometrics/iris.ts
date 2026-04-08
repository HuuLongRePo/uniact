// Offline Iris Feature Extraction (stub)
// Placeholder: Real iris recognition requires higher resolution & specialized preprocessing.

export interface IrisFeatures {
  vector: number[];
  quality: number; // 0..1 estimated focus/contrast
}

export function extractIrisFeatures(canvas: HTMLCanvasElement): IrisFeatures | null {
  // Stub: sample pixels center area approximate.
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const { width, height } = canvas;
  const sampleSize = 32;
  const startX = Math.max(0, Math.floor(width / 2 - sampleSize / 2));
  const startY = Math.max(0, Math.floor(height / 2 - sampleSize / 2));
  const data = ctx.getImageData(startX, startY, sampleSize, sampleSize).data;
  const vec: number[] = [];
  for (let i = 0; i < data.length; i += 4) {
    // grayscale
    const g = (data[i] + data[i + 1] + data[i + 2]) / 3;
    vec.push(g / 255);
  }
  // quality heuristic: variance
  const mean = vec.reduce((a, b) => a + b, 0) / vec.length;
  const variance = vec.reduce((a, b) => a + (b - mean) * (b - mean), 0) / vec.length;
  const quality = Math.min(1, variance * 4); // simplistic
  return { vector: vec.slice(0, 256), quality };
}

export function irisDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) return Infinity;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff += Math.abs(a[i] - b[i]);
  return diff / a.length; // lower better
}
