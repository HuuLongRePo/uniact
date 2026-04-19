export type FaceEmbedding = number[];

function isRuntimeEnvEnabled() {
  const value = process.env.ENABLE_FACE_BIOMETRIC_RUNTIME;
  return ['1', 'true', 'yes', 'on'].includes(String(value ?? '').trim().toLowerCase());
}

export const FACE_BIOMETRIC_RUNTIME_ENABLED = isRuntimeEnvEnabled();
export const FACE_BIOMETRIC_RUNTIME_MODE = FACE_BIOMETRIC_RUNTIME_ENABLED
  ? 'config_enabled_stubbed'
  : 'stubbed';

export class FaceBiometricUnavailableError extends Error {
  constructor(
    message = 'Tính năng nhận diện khuôn mặt hiện tạm thời không khả dụng trong bản phát hành này.'
  ) {
    super(message);
    this.name = 'FaceBiometricUnavailableError';
  }
}

export async function loadFaceModels(_basePath?: string): Promise<null> {
  return null;
}

export async function detectSingleEmbedding(
  _input?: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
): Promise<FaceDetectionResult | null> {
  return null;
}

export function cosineDistance(a: FaceEmbedding, b: FaceEmbedding): number {
  if (a.length !== b.length) return Infinity;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (!denom) return Infinity;
  return 1 - dot / denom;
}

export interface FacePoint {
  x: number;
  y: number;
}

export interface FaceDetectionResult {
  embedding: number[];
  landmarks: {
    positions: FacePoint[];
    getLeftEye(): FacePoint[];
    getRightEye(): FacePoint[];
  };
  detection: {
    score: number;
    box: {
      width: number;
      height: number;
    };
  };
  hasMask: boolean;
  qualityScore: number;
  livenessScore?: number;
}

export interface LivenessCheckResult {
  passed: boolean;
  blinkDetected: boolean;
  headMovement: boolean;
  score: number;
  details: string[];
}

export async function performLivenessCheck(
  _video?: HTMLVideoElement,
  _framesCount = 10,
  _intervalMs = 100
): Promise<LivenessCheckResult> {
  return {
    passed: false,
    blinkDetected: false,
    headMovement: false,
    score: 0,
    details: ['Face biometric runtime unavailable'],
  };
}
