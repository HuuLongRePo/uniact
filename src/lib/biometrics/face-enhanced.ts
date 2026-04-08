/**
 * Face Recognition with Enhanced Features
 * - Mask detection and upper face matching
 * - Liveness detection (blink + head movement)
 * - Quality scoring
 */

let modelsLoaded = false;
let faceapiRef: typeof import('face-api.js') | null = null;

async function getFaceApi() {
  if (faceapiRef) return faceapiRef;
  faceapiRef = await import('face-api.js');
  return faceapiRef;
}

export interface FaceDetectionResult {
  embedding: number[];
  landmarks: import('face-api.js').FaceLandmarks68;
  detection: import('face-api.js').FaceDetection;
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

/**
 * Load face-api.js models
 */
export async function loadFaceModels(): Promise<void> {
  if (modelsLoaded) return;

  const faceapi = await getFaceApi();
  const MODEL_URL = '/models';

  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]);

  modelsLoaded = true;
  console.warn('✅ Face recognition models loaded');
}

/**
 * Detect if face is wearing mask
 */
export function detectMask(landmarks: import('face-api.js').FaceLandmarks68): boolean {
  const points = landmarks.positions;

  const nose = points[33];
  const mouth = points[66];
  const chin = points[8];

  const noseToMouth = Math.abs(mouth.y - nose.y);
  const mouthToChin = Math.abs(chin.y - mouth.y);
  const ratio = mouthToChin / noseToMouth;

  return ratio < 0.35;
}

/**
 * Calculate face quality score
 */
export function calculateQualityScore(
  detection: import('face-api.js').FaceDetection,
  landmarks: import('face-api.js').FaceLandmarks68,
  imageWidth: number,
  imageHeight: number
): number {
  let score = 0;

  // Detection confidence (0-40)
  score += detection.score * 40;

  // Face size (0-30)
  const faceArea = detection.box.width * detection.box.height;
  const imageArea = imageWidth * imageHeight;
  const faceRatio = faceArea / imageArea;

  if (faceRatio >= 0.2 && faceRatio <= 0.6) score += 30;
  else if (faceRatio >= 0.1 && faceRatio <= 0.7) score += 20;
  else score += 10;

  // Face alignment (0-30)
  const leftEye = landmarks.getLeftEye();
  const rightEye = landmarks.getRightEye();

  const leftCenter = leftEye.reduce((sum, p) => ({ x: sum.x + p.x, y: sum.y + p.y }), {
    x: 0,
    y: 0,
  });
  const rightCenter = rightEye.reduce((sum, p) => ({ x: sum.x + p.x, y: sum.y + p.y }), {
    x: 0,
    y: 0,
  });

  leftCenter.x /= leftEye.length;
  leftCenter.y /= leftEye.length;
  rightCenter.x /= rightEye.length;
  rightCenter.y /= rightEye.length;

  const eyeYDiff = Math.abs(leftCenter.y - rightCenter.y);
  const eyeXDistance = Math.abs(rightCenter.x - leftCenter.x);
  const alignmentRatio = eyeYDiff / eyeXDistance;

  if (alignmentRatio < 0.1) score += 30;
  else if (alignmentRatio < 0.2) score += 20;
  else score += 10;

  return Math.min(100, Math.max(0, score));
}

/**
 * Detect single face with full details
 */
export async function detectSingleEmbedding(
  input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
): Promise<FaceDetectionResult | null> {
  await loadFaceModels();
  const faceapi = await getFaceApi();

  const detection = await faceapi
    .detectSingleFace(input, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!detection) return null;

  const hasMask = detectMask(detection.landmarks);
  const imageWidth = input instanceof HTMLVideoElement ? input.videoWidth : input.width;
  const imageHeight = input instanceof HTMLVideoElement ? input.videoHeight : input.height;
  const qualityScore = calculateQualityScore(
    detection.detection,
    detection.landmarks,
    imageWidth,
    imageHeight
  );

  return {
    embedding: Array.from(detection.descriptor),
    landmarks: detection.landmarks,
    detection: detection.detection,
    hasMask,
    qualityScore,
  };
}

/**
 * Calculate cosine distance with mask mode support
 */
export function cosineDistance(
  embedding1: number[],
  embedding2: number[],
  maskMode = false
): number {
  if (embedding1.length !== embedding2.length) {
    throw new Error('Embeddings must have same length');
  }

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < embedding1.length; i++) {
    const weight = maskMode && i < 64 ? 1.5 : 1.0;
    const val1 = embedding1[i] * weight;
    const val2 = embedding2[i] * weight;

    dotProduct += val1 * val2;
    norm1 += val1 * val1;
    norm2 += val2 * val2;
  }

  const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
  if (magnitude === 0) return 2;

  return 1 - dotProduct / magnitude;
}

/**
 * Perform liveness check
 */
export async function performLivenessCheck(
  video: HTMLVideoElement,
  framesCount = 10,
  intervalMs = 100
): Promise<LivenessCheckResult> {
  const frames: FaceDetectionResult[] = [];
  const details: string[] = [];

  for (let i = 0; i < framesCount; i++) {
    const result = await detectSingleEmbedding(video);
    if (result) frames.push(result);
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  if (frames.length < framesCount / 2) {
    return {
      passed: false,
      blinkDetected: false,
      headMovement: false,
      score: 0,
      details: ['Insufficient frames'],
    };
  }

  // Blink detection
  let blinkDetected = false;
  const earValues: number[] = [];

  for (const frame of frames) {
    const leftEye = frame.landmarks.getLeftEye();
    const rightEye = frame.landmarks.getRightEye();
    const leftEAR = calculateEAR(leftEye);
    const rightEAR = calculateEAR(rightEye);
    earValues.push((leftEAR + rightEAR) / 2);
  }

  const earRange = Math.max(...earValues) - Math.min(...earValues);
  const hasEarDrop = earValues.some((ear) => ear < 0.25);

  if (earRange > 0.05 && hasEarDrop) {
    blinkDetected = true;
    details.push('Blink detected ✓');
  } else {
    details.push('No blink - possible photo');
  }

  // Head movement detection
  let headMovement = false;
  const nosePositions = frames.map((f) => f.landmarks.positions[33]);
  const noseXVar = calculateVariance(nosePositions.map((p) => p.x));
  const noseYVar = calculateVariance(nosePositions.map((p) => p.y));

  if (noseXVar > 10 || noseYVar > 10) {
    headMovement = true;
    details.push('Head movement detected ✓');
  } else {
    details.push('Minimal movement');
  }

  let score = 0;
  if (blinkDetected) score += 50;
  if (headMovement) score += 50;

  return {
    passed: score >= 50,
    blinkDetected,
    headMovement,
    score,
    details,
  };
}

function calculateEAR(eyeLandmarks: import('face-api.js').Point[]): number {
  if (eyeLandmarks.length < 6) return 0;
  const v1 = distance(eyeLandmarks[1], eyeLandmarks[5]);
  const v2 = distance(eyeLandmarks[2], eyeLandmarks[4]);
  const h = distance(eyeLandmarks[0], eyeLandmarks[3]);
  return (v1 + v2) / (2.0 * h);
}

function distance(p1: import('face-api.js').Point, p2: import('face-api.js').Point): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

function calculateVariance(values: number[]): number {
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDiffs = values.map((val) => Math.pow(val - mean, 2));
  return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
}
