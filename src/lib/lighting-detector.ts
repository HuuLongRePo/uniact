/**
 * Lighting Detection & Auto-Adjustment
 *
 * Phát hiện điều kiện ánh sáng từ video stream và tự động điều chỉnh
 * để cải thiện chất lượng nhận diện khuôn mặt.
 */

export interface LightingAnalysis {
  brightness: number; // 0-255, trung bình của toàn bộ frame
  quality: 'excellent' | 'good' | 'fair' | 'poor' | 'insufficient';
  recommendation: string;
  canProceed: boolean; // true nếu đủ ánh sáng để nhận diện
}

export interface FaceQualityCheck {
  confidence: number; // 0-1, độ tin cậy phát hiện khuôn mặt
  size: number; // Kích thước khuôn mặt so với frame (0-1)
  centering: number; // Độ căn giữa (0-1, 1 = hoàn toàn giữa)
  angle: number; // Góc nghiêng (0-45 độ)
  quality: 'excellent' | 'good' | 'acceptable' | 'poor';
  issues: string[]; // Danh sách vấn đề cần khắc phục
}

/**
 * Phân tích độ sáng của video frame
 * @param videoElement - HTMLVideoElement đang stream camera
 * @returns LightingAnalysis object
 */
export function analyzeLighting(videoElement: HTMLVideoElement): LightingAnalysis {
  // Tạo canvas để lấy pixel data
  const canvas = document.createElement('canvas');
  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return {
      brightness: 0,
      quality: 'insufficient',
      recommendation: 'Không thể truy cập camera',
      canProceed: false,
    };
  }

  // Vẽ frame hiện tại lên canvas
  ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

  // Lấy pixel data
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Tính brightness trung bình (grayscale)
  let totalBrightness = 0;
  const pixelCount = data.length / 4; // RGBA format

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // Công thức grayscale chuẩn: 0.299R + 0.587G + 0.114B
    const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
    totalBrightness += brightness;
  }

  const avgBrightness = totalBrightness / pixelCount;

  // Phân loại chất lượng ánh sáng
  let quality: LightingAnalysis['quality'];
  let recommendation: string;
  let canProceed: boolean;

  if (avgBrightness >= 180) {
    quality = 'excellent';
    recommendation = '✅ Ánh sáng tuyệt vời, có thể nhận diện chính xác';
    canProceed = true;
  } else if (avgBrightness >= 120) {
    quality = 'good';
    recommendation = '✅ Ánh sáng tốt, đủ để nhận diện';
    canProceed = true;
  } else if (avgBrightness >= 80) {
    quality = 'fair';
    recommendation = '⚠️ Ánh sáng khá yếu, nên tăng độ sáng';
    canProceed = true;
  } else if (avgBrightness >= 40) {
    quality = 'poor';
    recommendation = '⚠️ Ánh sáng kém, vui lòng bật đèn hoặc di chuyển ra nơi sáng hơn';
    canProceed = false;
  } else {
    quality = 'insufficient';
    recommendation = '❌ Quá tối, không thể nhận diện. Vui lòng bật đèn!';
    canProceed = false;
  }

  return {
    brightness: Math.round(avgBrightness),
    quality,
    recommendation,
    canProceed,
  };
}

/**
 * Tự động điều chỉnh brightness và contrast của camera stream
 * @param stream - MediaStream từ getUserMedia
 * @param targetBrightness - Độ sáng mục tiêu (0-255, mặc định 120)
 * @returns Promise<void>
 */
export async function autoAdjustBrightness(
  stream: MediaStream,
  targetBrightness: number = 120
): Promise<void> {
  const videoTrack = stream.getVideoTracks()[0];

  if (!videoTrack) {
    throw new Error('Không tìm thấy video track');
  }

  // Kiểm tra capabilities
  const capabilities = videoTrack.getCapabilities();
  const settings = videoTrack.getSettings();

  // Danh sách constraints có thể điều chỉnh
  const adjustments: any = {};

  // 1. Brightness (nếu hỗ trợ)
  if ('brightness' in capabilities) {
    const brightnessRange = (capabilities as any).brightness as { min: number; max: number };
    // Map targetBrightness (0-255) sang range của camera
    const normalizedBrightness =
      (targetBrightness / 255) * (brightnessRange.max - brightnessRange.min) + brightnessRange.min;
    adjustments.brightness = normalizedBrightness;
  }

  // 2. Exposure (phơi sáng)
  if ('exposureMode' in capabilities) {
    adjustments.exposureMode = 'continuous'; // Auto exposure
  }

  // 3. White balance (cân bằng trắng)
  if ('whiteBalanceMode' in capabilities) {
    adjustments.whiteBalanceMode = 'continuous';
  }

  // 4. ISO (độ nhạy sáng)
  if ('iso' in capabilities) {
    const isoRange = (capabilities as any).iso as { min: number; max: number };
    // Tăng ISO nếu ánh sáng yếu
    if (targetBrightness < 80) {
      adjustments.iso = Math.max(800, isoRange.min); // High ISO cho low light
    } else {
      adjustments.iso = Math.min(400, isoRange.max); // Normal ISO
    }
  }

  // Áp dụng adjustments
  try {
    await videoTrack.applyConstraints(adjustments);
    console.warn('✅ Đã điều chỉnh ánh sáng:', adjustments);
  } catch (error) {
    console.warn('⚠️ Không thể điều chỉnh một số tham số:', error);
    // Không throw error, vẫn tiếp tục với settings mặc định
  }
}

/**
 * Kiểm tra chất lượng khuôn mặt trong frame
 * @param faceDetection - Kết quả từ face detection API (ví dụ: face-api.js)
 * @param videoWidth - Chiều rộng video frame
 * @param videoHeight - Chiều cao video frame
 * @returns FaceQualityCheck object
 */
export function checkFaceQuality(
  faceDetection: {
    confidence: number;
    box: { x: number; y: number; width: number; height: number };
    angle?: number;
  },
  videoWidth: number,
  videoHeight: number
): FaceQualityCheck {
  const issues: string[] = [];

  // 1. Confidence (độ tin cậy)
  const confidence = faceDetection.confidence;
  if (confidence < 0.5) {
    issues.push('Độ tin cậy phát hiện thấp');
  }

  // 2. Size (kích thước khuôn mặt)
  const faceArea = faceDetection.box.width * faceDetection.box.height;
  const frameArea = videoWidth * videoHeight;
  const sizeRatio = faceArea / frameArea;

  if (sizeRatio < 0.05) {
    issues.push('Khuôn mặt quá nhỏ, hãy lại gần camera');
  } else if (sizeRatio > 0.7) {
    issues.push('Khuôn mặt quá gần, hãy lùi ra xa');
  }

  // 3. Centering (độ căn giữa)
  const faceCenterX = faceDetection.box.x + faceDetection.box.width / 2;
  const faceCenterY = faceDetection.box.y + faceDetection.box.height / 2;
  const frameCenterX = videoWidth / 2;
  const frameCenterY = videoHeight / 2;

  const offsetX = Math.abs(faceCenterX - frameCenterX) / videoWidth;
  const offsetY = Math.abs(faceCenterY - frameCenterY) / videoHeight;
  const centeringScore = 1 - Math.max(offsetX, offsetY);

  if (centeringScore < 0.6) {
    issues.push('Hãy đặt khuôn mặt vào giữa khung hình');
  }

  // 4. Angle (góc nghiêng)
  const angle = Math.abs(faceDetection.angle || 0);
  if (angle > 15) {
    issues.push('Khuôn mặt bị nghiêng, hãy nhìn thẳng vào camera');
  }

  // Tính điểm chất lượng tổng thể
  let quality: FaceQualityCheck['quality'];
  const totalScore = (confidence + sizeRatio * 2 + centeringScore + (1 - angle / 45)) / 5;

  if (totalScore >= 0.8 && issues.length === 0) {
    quality = 'excellent';
  } else if (totalScore >= 0.6 && issues.length <= 1) {
    quality = 'good';
  } else if (totalScore >= 0.4 || issues.length <= 2) {
    quality = 'acceptable';
  } else {
    quality = 'poor';
  }

  return {
    confidence,
    size: sizeRatio,
    centering: centeringScore,
    angle,
    quality,
    issues,
  };
}

/**
 * Phát hiện backlight (ánh sáng phía sau)
 * @param videoElement - HTMLVideoElement đang stream camera
 * @returns true nếu phát hiện backlight
 */
export function detectBacklight(videoElement: HTMLVideoElement): boolean {
  const canvas = document.createElement('canvas');
  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) return false;

  ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

  // Lấy độ sáng của viền frame
  const topBrightness = getRegionBrightness(ctx, 0, 0, canvas.width, canvas.height * 0.2);
  const bottomBrightness = getRegionBrightness(
    ctx,
    0,
    canvas.height * 0.8,
    canvas.width,
    canvas.height * 0.2
  );
  const leftBrightness = getRegionBrightness(ctx, 0, 0, canvas.width * 0.2, canvas.height);
  const rightBrightness = getRegionBrightness(
    ctx,
    canvas.width * 0.8,
    0,
    canvas.width * 0.2,
    canvas.height
  );

  // Lấy độ sáng ở trung tâm (khuôn mặt)
  const centerBrightness = getRegionBrightness(
    ctx,
    canvas.width * 0.3,
    canvas.height * 0.3,
    canvas.width * 0.4,
    canvas.height * 0.4
  );

  const edgeBrightness = (topBrightness + bottomBrightness + leftBrightness + rightBrightness) / 4;

  // Backlight: viền sáng hơn trung tâm rất nhiều
  return edgeBrightness > centerBrightness * 1.5;
}

/**
 * Helper: Tính brightness trung bình của một vùng
 */
function getRegionBrightness(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number
): number {
  const imageData = ctx.getImageData(x, y, width, height);
  const data = imageData.data;

  let total = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    total += 0.299 * r + 0.587 * g + 0.114 * b;
  }

  return total / (data.length / 4);
}

/**
 * Gợi ý cải thiện điều kiện ánh sáng
 * @param analysis - Kết quả từ analyzeLighting
 * @returns Danh sách gợi ý
 */
export function getSuggestions(analysis: LightingAnalysis): string[] {
  const suggestions: string[] = [];

  if (analysis.brightness < 40) {
    suggestions.push('🔦 Bật đèn trong phòng');
    suggestions.push('☀️ Di chuyển ra gần cửa sổ');
    suggestions.push('💡 Sử dụng đèn bàn chiếu sáng khuôn mặt');
  } else if (analysis.brightness < 80) {
    suggestions.push('💡 Tăng độ sáng đèn');
    suggestions.push('📱 Điều chỉnh góc camera tránh ngược sáng');
  } else if (analysis.brightness > 220) {
    suggestions.push('😎 Ánh sáng quá chói, giảm bớt');
    suggestions.push('📱 Điều chỉnh góc camera tránh ánh sáng trực tiếp');
  }

  return suggestions;
}
