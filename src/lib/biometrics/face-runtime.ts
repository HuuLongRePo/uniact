export type FaceEmbedding = number[];

export type FaceRuntimeMode = 'stubbed' | 'config_enabled_stubbed' | 'runtime_ready';

export interface FaceRuntimeAdapter {
  mode: FaceRuntimeMode;
  loadModels(basePath?: string): Promise<null>;
  detectSingleEmbedding(
    input?: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
  ): Promise<FaceDetectionResult | null>;
  performLivenessCheck(
    video?: HTMLVideoElement,
    framesCount?: number,
    intervalMs?: number
  ): Promise<LivenessCheckResult>;
}

function isRuntimeEnvEnabled() {
  const value = process.env.ENABLE_FACE_BIOMETRIC_RUNTIME;
  return ['1', 'true', 'yes', 'on'].includes(String(value ?? '').trim().toLowerCase());
}

function resolveRuntimeMode(): FaceRuntimeMode {
  if (!isRuntimeEnvEnabled()) {
    return 'stubbed';
  }

  const requestedMode = String(process.env.FACE_BIOMETRIC_RUNTIME_MODE ?? '')
    .trim()
    .toLowerCase();

  if (requestedMode === 'runtime_ready') {
    return 'runtime_ready';
  }

  return 'config_enabled_stubbed';
}

export const FACE_BIOMETRIC_RUNTIME_ENABLED = isRuntimeEnvEnabled();
export const FACE_BIOMETRIC_RUNTIME_MODE = resolveRuntimeMode();

export class FaceBiometricUnavailableError extends Error {
  constructor(
    message = 'Tính năng nhận diện khuôn mặt hiện tạm thời không khả dụng trong bản phát hành này.'
  ) {
    super(message);
    this.name = 'FaceBiometricUnavailableError';
  }
}

function createStubbedAdapter(mode: FaceRuntimeMode): FaceRuntimeAdapter {
  return {
    mode,
    async loadModels(_basePath?: string) {
      return null;
    },
    async detectSingleEmbedding(
      _input?: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
    ) {
      return null;
    },
    async performLivenessCheck(
      _video?: HTMLVideoElement,
      _framesCount = 10,
      _intervalMs = 100
    ) {
      return {
        passed: false,
        blinkDetected: false,
        headMovement: false,
        score: 0,
        details: ['Face biometric runtime unavailable'],
      };
    },
  };
}

export function getFaceRuntimeAdapter(): FaceRuntimeAdapter {
  return createStubbedAdapter(FACE_BIOMETRIC_RUNTIME_MODE);
}

export async function loadFaceModels(basePath?: string): Promise<null> {
  return getFaceRuntimeAdapter().loadModels(basePath);
}

export async function detectSingleEmbedding(
  input?: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
): Promise<FaceDetectionResult | null> {
  return getFaceRuntimeAdapter().detectSingleEmbedding(input);
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
  video?: HTMLVideoElement,
  framesCount = 10,
  intervalMs = 100
): Promise<LivenessCheckResult> {
  return getFaceRuntimeAdapter().performLivenessCheck(video, framesCount, intervalMs);
}
