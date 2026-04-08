// Offline Face Recognition Utilities (stub)
// NOTE: This is an initial scaffold. Real accuracy requires model calibration.

export type FaceEmbedding = number[];

let faceapiRef: any | null = null;

export async function loadFaceModels(basePath: string = '/models') {
  if (typeof window === 'undefined') return null;
  if (faceapiRef) return faceapiRef;
  const faceapi = await import('face-api.js');
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(basePath),
    faceapi.nets.faceLandmark68Net.loadFromUri(basePath),
    faceapi.nets.faceRecognitionNet.loadFromUri(basePath),
  ]);
  faceapiRef = faceapi;
  return faceapiRef;
}

export async function detectSingleEmbedding(
  video: HTMLVideoElement
): Promise<FaceEmbedding | null> {
  if (!faceapiRef) return null;
  const result = await faceapiRef
    .detectSingleFace(video, new faceapiRef.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor();
  if (!result) return null;
  return Array.from(result.descriptor);
}

export function cosineDistance(a: FaceEmbedding, b: FaceEmbedding): number {
  if (a.length !== b.length) return Infinity;
  let dot = 0,
    normA = 0,
    normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (!denom) return Infinity;
  return 1 - dot / denom; // distance (lower is better)
}
