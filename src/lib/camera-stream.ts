function isLikelyEmbeddedBrowser() {
  if (typeof navigator === 'undefined') return false;

  const userAgent = navigator.userAgent.toLowerCase();
  return /fban|fbav|instagram|zalo|line\/|micromessenger|wv\)|webview|snapchat|tiktok/.test(
    userAgent
  );
}

function isLikelyIOS() {
  if (typeof navigator === 'undefined') return false;
  const userAgent = navigator.userAgent.toLowerCase();
  return (
    /iphone|ipad|ipod/.test(userAgent) ||
    (/macintosh/.test(userAgent) && typeof window !== 'undefined' && 'ontouchend' in window)
  );
}

function isTrustedLocalHost(hostname: string) {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname.endsWith('.localhost')
  );
}

function isLikelyPrivateLanHost(hostname: string) {
  return (
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
  );
}

function getEmbeddedBrowserCameraHint() {
  return 'Thiết bị đang mở trong trình duyệt nhúng của ứng dụng. Hãy mở liên kết bằng Chrome, Safari hoặc Edge để dùng camera ổn định.';
}

function getUnsupportedCameraApiHint() {
  if (isLikelyEmbeddedBrowser()) {
    return getEmbeddedBrowserCameraHint();
  }

  if (isLikelyIOS()) {
    return 'Thiết bị iOS hiện tại chưa cấp đầy đủ Camera API cho trang này. Hãy mở bằng Safari mới nhất và kiểm tra quyền camera.';
  }

  return 'Trình duyệt hiện tại không cung cấp Camera API đầy đủ. Hãy cập nhật Chrome, Safari hoặc Edge và mở trang ở trình duyệt hệ thống.';
}

function getInsecureContextHint() {
  if (typeof window === 'undefined') {
    return 'Không thể truy cập camera trong môi trường hiện tại.';
  }

  const { protocol, hostname } = window.location;

  if (protocol === 'https:') {
    return 'Trình duyệt đang bật HTTPS nhưng camera vẫn bị chặn do ngữ cảnh không an toàn. Hãy tải lại trang hoặc mở bằng trình duyệt hệ thống.';
  }

  if (isTrustedLocalHost(hostname)) {
    return `Camera cần ngữ cảnh bảo mật. Trang local (${protocol}//${hostname}) đang chạy ở trạng thái không an toàn, hãy thử lại trên localhost chuẩn hoặc HTTPS.`;
  }

  if (isLikelyEmbeddedBrowser()) {
    return `${getEmbeddedBrowserCameraHint()} Liên kết camera cần chạy trên HTTPS hoặc localhost.`;
  }

  if (isLikelyPrivateLanHost(hostname)) {
    return `Camera bị chặn vì địa chỉ hiện tại (${protocol}//${hostname}) chưa bảo mật. Với điện thoại, hãy dùng HTTPS (ví dụ tunnel) hoặc mở bằng localhost khi test trên máy.`;
  }

  return `Camera chỉ hoạt động trên kết nối bảo mật HTTPS hoặc localhost. Địa chỉ hiện tại (${protocol}//${hostname}) chưa bảo mật.`;
}

function normalizeCameraErrorName(error: unknown) {
  return error instanceof Error ? error.name : String((error as { name?: string })?.name || '');
}

function isCameraBlockedByPermissionsPolicy() {
  if (typeof document === 'undefined') return false;

  type PolicyLike = {
    allowsFeature?: (feature: string) => boolean;
  };

  const docWithPolicy = document as Document & {
    permissionsPolicy?: PolicyLike;
    featurePolicy?: PolicyLike;
  };

  const policy = docWithPolicy.permissionsPolicy ?? docWithPolicy.featurePolicy;
  if (!policy || typeof policy.allowsFeature !== 'function') return false;

  try {
    return policy.allowsFeature('camera') === false;
  } catch {
    return false;
  }
}

function isPermissionsPolicyError(error: unknown) {
  const name = normalizeCameraErrorName(error).toLowerCase();
  const message = error instanceof Error ? error.message.toLowerCase() : '';

  return (
    name.includes('securityerror') ||
    message.includes('permissions policy') ||
    message.includes('permission policy') ||
    message.includes('policy controlled feature') ||
    message.includes('camera has been disabled')
  );
}

function getPermissionsPolicyCameraHint() {
  return 'Camera Ä‘ang bá»‹ cháº·n bá»Ÿi Permissions-Policy cá»§a há»‡ thá»‘ng. HÃ£y cho phÃ©p camera cho origin hiá»‡n táº¡i rá»“i táº£i láº¡i trang.';
}

export function getCameraTroubleshootingSteps(error?: unknown) {
  const tips: string[] = [];
  const errorName = normalizeCameraErrorName(error);

  if (typeof window !== 'undefined' && !window.isSecureContext) {
    tips.push(getInsecureContextHint());
  }

  if (isLikelyEmbeddedBrowser()) {
    tips.push(
      'Mở liên kết bằng Chrome, Safari hoặc Edge thay vì trình duyệt nhúng trong ứng dụng.'
    );
  }

  if (typeof navigator !== 'undefined') {
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
      tips.push(getUnsupportedCameraApiHint());
    }
  }

  if (isCameraBlockedByPermissionsPolicy() || isPermissionsPolicyError(error)) {
    tips.push(getPermissionsPolicyCameraHint());
  }

  if (errorName === 'NotAllowedError' || errorName === 'SecurityError') {
    tips.push('Vào cài đặt trình duyệt thiết bị và cấp quyền Camera cho trang này rồi thử lại.');
  }

  if (
    errorName === 'NotReadableError' ||
    errorName === 'TrackStartError' ||
    errorName === 'AbortError'
  ) {
    tips.push('Đóng các ứng dụng khác đang dùng camera (Zalo, Meet, Camera app...) rồi quét lại.');
  }

  if (isLikelyIOS()) {
    tips.push('Với iPhone/iPad, hãy dùng Safari phiên bản mới nhất để camera hoạt động ổn định.');
  }

  tips.push('Nếu vẫn lỗi, thử tải lại trang hoặc chuyển sang thiết bị khác cùng tài khoản.');

  return Array.from(new Set(tips));
}

export async function requestPreferredCameraStream(options?: {
  facingMode?: 'user' | 'environment';
  width?: number;
  height?: number;
}) {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    throw new Error('Không thể truy cập camera trong môi trường hiện tại.');
  }

  if (!window.isSecureContext) {
    throw new Error(getInsecureContextHint());
  }

  if (isCameraBlockedByPermissionsPolicy()) {
    throw new Error(getPermissionsPolicyCameraHint());
  }

  if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
    throw new Error(getUnsupportedCameraApiHint());
  }

  const facingMode = options?.facingMode || 'environment';
  const width = options?.width || 1280;
  const height = options?.height || 720;

  const attempts: MediaStreamConstraints[] = [
    {
      video: {
        facingMode: { ideal: facingMode },
        width: { ideal: width },
        height: { ideal: height },
      },
      audio: false,
    },
    {
      video: {
        facingMode,
        width: { ideal: width },
        height: { ideal: height },
      },
      audio: false,
    },
    {
      video: {
        width: { ideal: width },
        height: { ideal: height },
      },
      audio: false,
    },
    {
      video: true,
      audio: false,
    },
  ];

  let lastError: unknown = null;

  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Không truy cập được camera.');
}

export function getCameraAccessErrorMessage(error: unknown) {
  const errorName =
    error instanceof Error ? error.name : String((error as { name?: string })?.name || '');
  const errorMessage = error instanceof Error ? error.message.toLowerCase() : '';

  if (errorName === 'NotAllowedError' || errorName === 'SecurityError') {
    if (isPermissionsPolicyError(error) || isCameraBlockedByPermissionsPolicy()) {
      return getPermissionsPolicyCameraHint();
    }

    if (isLikelyEmbeddedBrowser()) {
      return `${getEmbeddedBrowserCameraHint()} Nếu đã cấp quyền nhưng vẫn lỗi, hãy mở bằng trình duyệt hệ thống rồi thử lại.`;
    }
    return 'Bạn đã từ chối quyền camera. Hãy bật lại quyền camera trong trình duyệt rồi thử lại.';
  }

  if (errorName === 'NotFoundError') {
    return 'Không tìm thấy camera trên thiết bị.';
  }

  if (
    errorName === 'NotReadableError' ||
    errorName === 'TrackStartError' ||
    errorName === 'AbortError'
  ) {
    return 'Camera đang được ứng dụng khác sử dụng hoặc không thể khởi động. Hãy đóng app đang dùng camera rồi thử lại.';
  }

  if (errorName === 'OverconstrainedError' || errorName === 'ConstraintNotSatisfiedError') {
    return 'Thiết bị không đáp ứng cấu hình camera yêu cầu. Hệ thống đã thử fallback nhưng vẫn thất bại.';
  }

  if (errorName === 'NotSupportedError' || errorName === 'TypeError') {
    return getUnsupportedCameraApiHint();
  }

  if (isCameraBlockedByPermissionsPolicy() || isPermissionsPolicyError(error)) {
    return getPermissionsPolicyCameraHint();
  }

  if (
    errorMessage.includes('secure') ||
    errorMessage.includes('https') ||
    errorMessage.includes('insecure')
  ) {
    return getInsecureContextHint();
  }

  if (
    errorMessage.includes('permission') ||
    errorMessage.includes('denied') ||
    errorMessage.includes('notallowed')
  ) {
    return 'Ứng dụng chưa có quyền camera. Hãy cấp quyền camera trong trình duyệt hoặc cài đặt thiết bị rồi thử lại.';
  }

  if (
    errorMessage.includes('getusermedia') ||
    errorMessage.includes('not supported') ||
    errorMessage.includes('unsupported')
  ) {
    return getUnsupportedCameraApiHint();
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Không truy cập được camera.';
}
