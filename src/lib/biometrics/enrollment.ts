import { detectSingleEmbedding, loadFaceModels } from './face';
import { extractIrisFeatures } from './iris';

export interface EnrollmentOptions {
  captureFrames?: number;
  enableIris?: boolean;
}

export interface EnrollmentResult {
  faceEmbedding?: number[];
  irisFeatures?: { vector: number[]; quality: number };
  steps: string[];
}

export async function enrollBiometric(
  video: HTMLVideoElement,
  canvas?: HTMLCanvasElement,
  opts: EnrollmentOptions = {}
): Promise<EnrollmentResult> {
  const steps: string[] = [];
  await loadFaceModels();
  steps.push('Models loaded');
  const frames = opts.captureFrames || 5;
  let embedding: number[] | undefined;
  for (let i = 0; i < frames; i++) {
    const e = await detectSingleEmbedding(video);
    if (e) {
      embedding = e;
      steps.push(`Face embedding captured at frame ${i + 1}`);
      break;
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  let irisData: { vector: number[]; quality: number } | undefined;
  if (opts.enableIris && canvas) {
    irisData = extractIrisFeatures(canvas) || undefined;
    steps.push('Iris features extracted');
  }
  return { faceEmbedding: embedding, irisFeatures: irisData, steps };
}
