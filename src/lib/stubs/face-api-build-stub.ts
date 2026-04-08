export const nets = {
  tinyFaceDetector: { loadFromUri: async () => undefined },
  faceLandmark68Net: { loadFromUri: async () => undefined },
  faceRecognitionNet: { loadFromUri: async () => undefined },
};

export class TinyFaceDetectorOptions {}

export async function detectSingleFace() {
  throw new Error('face-api.js build stub should not run at runtime');
}

const faceapi = {
  nets,
  TinyFaceDetectorOptions,
  detectSingleFace,
};

export default faceapi;
