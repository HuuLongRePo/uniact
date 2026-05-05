'use client';

import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { CheckCircle2, CircleAlert, Info, Pause, RotateCcw, ScanLine } from 'lucide-react';
import {
  getCameraAccessErrorMessage,
  getCameraTroubleshootingSteps,
  requestPreferredCameraStream,
} from '@/lib/camera-stream';
import {
  createBarcodeDetectorInstance,
  decodeQrValueFromSource,
  loadJsQrDecoder,
  type BarcodeDetectorInstance,
  type JsQrDecoder,
} from '@/lib/qr-scan-decoder';
import {
  getZxingResultText,
  loadZxingBrowserQrReader,
  type ZxingBrowserQrReader,
  type ZxingScanControls,
} from '@/lib/zxing-qr-scanner';
import {
  loadRuntimeQrScannerFactory,
  type RuntimeQrScanner,
  type RuntimeQrScannerFactory,
} from '@/lib/qr-scanner-runtime';

type ScanState = 'idle' | 'scanning' | 'success' | 'error';
const MAX_DECODE_DIMENSION = 1024;
const DECODE_INTERVAL_MS = 50;
const NO_RESULT_NOTICE_MS = 4000;
const FALLBACK_ARM_DELAY_MS = 1400;

export type StudentQrScannerCameraState =
  | 'idle'
  | 'requesting'
  | 'ready'
  | 'playback_blocked'
  | 'error'
  | 'stopped';
export type StudentQrScannerDecoderEngine =
  | 'initializing'
  | 'qr-scanner'
  | 'zxing'
  | 'barcode-detector'
  | 'jsqr'
  | 'none';
export type StudentQrScannerDecoderState = 'idle' | 'scanning' | 'decoded' | 'timeout' | 'error';

export interface StudentQrScannerDebugState {
  scanState: ScanState;
  cameraState: StudentQrScannerCameraState;
  decoderEngine: StudentQrScannerDecoderEngine;
  decoderState: StudentQrScannerDecoderState;
  lastDecodedRaw: string | null;
  error: string | null;
  note: string | null;
}

interface Props {
  onScan: (rawValue: string) => Promise<void>;
  onDebugChange?: (patch: Partial<StudentQrScannerDebugState>) => void;
}

export function StudentQRScanner({ onScan, onDebugChange }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRequest = useRef<number | undefined>(undefined);
  const detectorRef = useRef<BarcodeDetectorInstance | null>(null);
  const jsQrDecoderRef = useRef<JsQrDecoder | null>(null);
  const runtimeQrScannerFactoryRef = useRef<RuntimeQrScannerFactory | null>(null);
  const runtimeQrScannerRef = useRef<RuntimeQrScanner | null>(null);
  const zxingReaderRef = useRef<ZxingBrowserQrReader | null>(null);
  const zxingControlsRef = useRef<ZxingScanControls | null>(null);
  const decoderInitPromiseRef = useRef<Promise<void> | null>(null);
  const submittingRef = useRef(false);
  const processingFrameRef = useRef(false);
  const lastDecodeAtRef = useRef(0);
  const lastScannedRawRef = useRef('');
  const decodeCycleRef = useRef(0);
  const autoStartAttemptedRef = useRef(false);
  const scanStartedAtRef = useRef(0);
  const lastNoResultNoticeAtRef = useRef(0);
  const scanStateRef = useRef<ScanState>('idle');
  const fallbackArmTimerRef = useRef<number | undefined>(undefined);

  const [scanState, setScanState] = useState<ScanState>('idle');
  const [needsPlaybackGesture, setNeedsPlaybackGesture] = useState(false);
  const [lastResult, setLastResult] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cameraTips, setCameraTips] = useState<string[]>(() => getCameraTroubleshootingSteps());
  const [autoScanSupported, setAutoScanSupported] = useState(false);
  const [insecureContext, setInsecureContext] = useState(false);

  function reportDebug(patch: Partial<StudentQrScannerDebugState>) {
    onDebugChange?.(patch);
  }

  useEffect(() => {
    scanStateRef.current = scanState;
  }, [scanState]);

  const scanStateLabel =
    scanState === 'scanning'
      ? 'Đang quét'
      : scanState === 'success'
        ? 'Đã ghi nhận'
        : scanState === 'error'
          ? 'Cần thử lại'
          : 'Sẵn sàng';

  const scanStateHint =
    scanState === 'scanning'
      ? 'Đưa camera vào vùng mã QR ở khoảng cách gần, hệ thống sẽ tự nhận nhanh.'
      : scanState === 'success'
        ? 'Hệ thống đã ghi nhận điểm danh thành công cho mã vừa quét.'
        : scanState === 'error'
          ? 'Giữ máy ổn định hơn hoặc lại gần mã QR rồi bấm Quét lại.'
          : 'Bấm Bật camera hoặc Quét lại để bắt đầu.';

  const cameraButtonDisabled = (() => {
    if (!insecureContext || typeof window === 'undefined') return false;
    const host = window.location.hostname;
    return !(host === 'localhost' || host === '127.0.0.1' || host === '::1' || host.endsWith('.localhost'));
  })();

  function drawCenteredSquareFrame(
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement,
    context: CanvasRenderingContext2D,
    zoom = 1
  ) {
    const sourceWidth = video.videoWidth;
    const sourceHeight = video.videoHeight;
    if (!sourceWidth || !sourceHeight) {
      return false;
    }

    const boundedZoom = Math.min(1, Math.max(0.45, zoom));
    const side = Math.floor(Math.min(sourceWidth, sourceHeight) * boundedZoom);
    const sx = Math.floor((sourceWidth - side) / 2);
    const sy = Math.floor((sourceHeight - side) / 2);
    const targetSide = Math.min(side, MAX_DECODE_DIMENSION);
    canvas.width = targetSide;
    canvas.height = targetSide;
    context.drawImage(video, sx, sy, side, side, 0, 0, targetSide, targetSide);
    return true;
  }

  function drawFullFrame(
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement,
    context: CanvasRenderingContext2D
  ) {
    const sourceWidth = video.videoWidth;
    const sourceHeight = video.videoHeight;
    if (!sourceWidth || !sourceHeight) {
      return false;
    }

    const scale = Math.min(1, MAX_DECODE_DIMENSION / Math.max(sourceWidth, sourceHeight));
    const targetWidth = Math.max(1, Math.round(sourceWidth * scale));
    const targetHeight = Math.max(1, Math.round(sourceHeight * scale));
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    context.drawImage(video, 0, 0, sourceWidth, sourceHeight, 0, 0, targetWidth, targetHeight);
    return true;
  }

  function stopScan(nextState: ScanState = 'idle') {
    if (frameRequest.current) {
      cancelAnimationFrame(frameRequest.current);
      frameRequest.current = undefined;
    }
    if (fallbackArmTimerRef.current) {
      window.clearTimeout(fallbackArmTimerRef.current);
      fallbackArmTimerRef.current = undefined;
    }

    try {
      zxingControlsRef.current?.stop();
    } catch {}
    zxingControlsRef.current = null;
    try {
      runtimeQrScannerRef.current?.stop();
    } catch {}
    try {
      runtimeQrScannerRef.current?.destroy();
    } catch {}
    runtimeQrScannerRef.current = null;

    const stream = videoRef.current?.srcObject as MediaStream | undefined;
    stream?.getTracks().forEach((track) => track.stop());

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setNeedsPlaybackGesture(false);
    setScanState(nextState);
    reportDebug({
      scanState: nextState,
      cameraState: 'stopped',
      decoderState: nextState === 'success' ? 'decoded' : 'idle',
      note:
        nextState === 'success'
          ? 'Đã dừng camera sau khi điểm danh thành công.'
          : 'Đã dừng camera.',
    });
  }

  function startFallbackLoop(preferredEngine: 'barcode-detector' | 'jsqr') {
    if (frameRequest.current || (!detectorRef.current && !jsQrDecoderRef.current)) {
      return;
    }

    reportDebug({
      decoderEngine: runtimeQrScannerRef.current ? 'qr-scanner' : preferredEngine,
      decoderState: 'scanning',
      note:
        runtimeQrScannerRef.current
          ? preferredEngine === 'barcode-detector'
            ? 'qr-scanner dang chay, BarcodeDetector/jsQR dang ho tro song song.'
            : 'qr-scanner dang chay, jsQR dang ho tro song song.'
          : preferredEngine === 'barcode-detector'
            ? 'Đang quét bằng BarcodeDetector, có jsQR dự phòng song song.'
            : 'Đang quét bằng jsQR dự phòng.',
    });
    frameRequest.current = requestAnimationFrame(tick);
  }

  function armFallbackLoop(preferredEngine: 'barcode-detector' | 'jsqr', delayMs = FALLBACK_ARM_DELAY_MS) {
    if (frameRequest.current || (!detectorRef.current && !jsQrDecoderRef.current)) {
      return;
    }
    if (fallbackArmTimerRef.current) {
      window.clearTimeout(fallbackArmTimerRef.current);
    }
    fallbackArmTimerRef.current = window.setTimeout(() => {
      fallbackArmTimerRef.current = undefined;
      if (scanStateRef.current !== 'scanning' || submittingRef.current) {
        return;
      }
      startFallbackLoop(preferredEngine);
    }, delayMs);
  }

  async function ensureDecoderReady() {
    if (!decoderInitPromiseRef.current) {
      decoderInitPromiseRef.current = (async () => {
        reportDebug({
          decoderEngine: 'initializing',
          decoderState: 'idle',
          note: 'Đang khởi tạo bộ quét QR.',
        });
        detectorRef.current = createBarcodeDetectorInstance();
        // Always preload jsQR as fallback because BarcodeDetector can be present but flaky
        // (especially on some iOS/Safari builds).
        jsQrDecoderRef.current = await loadJsQrDecoder();
        runtimeQrScannerFactoryRef.current = await loadRuntimeQrScannerFactory();
        zxingReaderRef.current = await loadZxingBrowserQrReader();

        const preferredEngine = runtimeQrScannerFactoryRef.current
          ? 'qr-scanner'
          : zxingReaderRef.current
          ? 'zxing'
          : detectorRef.current
            ? 'barcode-detector'
            : jsQrDecoderRef.current
              ? 'jsqr'
              : 'none';
        const supported = Boolean(
          runtimeQrScannerFactoryRef.current ||
            zxingReaderRef.current ||
            detectorRef.current ||
            jsQrDecoderRef.current
        );
        setAutoScanSupported(supported);
        reportDebug({
          decoderEngine: preferredEngine,
          decoderState: supported ? 'idle' : 'error',
          note: supported
            ? `Bộ quét sẵn sàng (${preferredEngine}).`
            : 'Trình duyệt không hỗ trợ bộ quét QR.',
        });
      })();
    }

    await decoderInitPromiseRef.current;
  }

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setInsecureContext(!window.isSecureContext);
    reportDebug({
      scanState: 'idle',
      cameraState: 'idle',
      decoderEngine: 'initializing',
      decoderState: 'idle',
      lastDecodedRaw: null,
      error: null,
      note: 'Chờ khởi tạo camera và bộ quét.',
    });
  }, []);

  useEffect(() => {
    if (autoStartAttemptedRef.current) return;
    autoStartAttemptedRef.current = true;

    let mounted = true;
    void ensureDecoderReady().then(() => {
      if (mounted) {
        void startScan();
      }
    });

    return () => {
      mounted = false;
      stopScan();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startScan() {
    await ensureDecoderReady();

    stopScan('idle');
    setNeedsPlaybackGesture(false);
    setError(null);
    setScanState('scanning');
    lastScannedRawRef.current = '';
    decodeCycleRef.current = 0;
    scanStartedAtRef.current = Date.now();
    lastNoResultNoticeAtRef.current = 0;
    reportDebug({
      scanState: 'scanning',
      cameraState: 'requesting',
      decoderState: 'idle',
      lastDecodedRaw: null,
      error: null,
      note: 'Đang yêu cầu quyền camera.',
    });

    try {
      if (videoRef.current && runtimeQrScannerFactoryRef.current) {
        try {
          reportDebug({
            decoderEngine: 'qr-scanner',
            cameraState: 'requesting',
            decoderState: 'scanning',
            note: 'Đang bật camera và quét bằng qr-scanner.',
          });
          runtimeQrScannerRef.current = runtimeQrScannerFactoryRef.current.create({
            video: videoRef.current,
            onDecode: (decodedValue) => {
              if (!decodedValue || decodedValue === lastScannedRawRef.current) {
                return;
              }

              lastScannedRawRef.current = decodedValue;
              reportDebug({
                decoderEngine: 'qr-scanner',
                decoderState: 'decoded',
                lastDecodedRaw: decodedValue,
                error: null,
                note: 'qr-scanner đã giải mã QR.',
              });
              void submitRawValue(decodedValue);
            },
            onDecodeError: (decodeError) => {
              const message =
                decodeError instanceof Error ? decodeError.message : String(decodeError || '');
              if (!message) {
                return;
              }

              reportDebug({
                decoderEngine: 'qr-scanner',
                decoderState: 'scanning',
                note: `qr-scanner đang bỏ qua lỗi tạm thời: ${message}`,
              });
            },
          });
          await runtimeQrScannerRef.current.start();

          const runtimeStream = videoRef.current.srcObject as MediaStream | undefined;
          const firstRuntimeTrack = runtimeStream?.getVideoTracks?.()[0];
          if (firstRuntimeTrack && typeof firstRuntimeTrack.applyConstraints === 'function') {
            void firstRuntimeTrack
              .applyConstraints({
                advanced: [{ focusMode: 'continuous' as ConstrainDOMString }],
              })
              .catch(() => undefined);
          }

          setCameraTips(getCameraTroubleshootingSteps());
          reportDebug({
            cameraState: 'ready',
            decoderEngine: 'qr-scanner',
            decoderState: 'scanning',
            note: 'Camera đã sẵn sàng, qr-scanner đang quét liên tục.',
          });

          if (detectorRef.current || jsQrDecoderRef.current) {
            armFallbackLoop(detectorRef.current ? 'barcode-detector' : 'jsqr');
          }
          return;
        } catch (runtimeErr: unknown) {
          try {
            runtimeQrScannerRef.current?.destroy();
          } catch {}
          runtimeQrScannerRef.current = null;
          reportDebug({
            decoderEngine: 'qr-scanner',
            decoderState: 'error',
            note: `qr-scanner không khởi động được, chuyển sang luồng dự phòng. ${
              runtimeErr instanceof Error ? runtimeErr.message : ''
            }`.trim(),
          });
        }
      }

      const mediaStream = await requestPreferredCameraStream({
        facingMode: 'environment',
        width: 2560,
        height: 1440,
      });
      const firstVideoTrack = mediaStream.getVideoTracks()[0];
      if (firstVideoTrack && typeof firstVideoTrack.applyConstraints === 'function') {
        void firstVideoTrack.applyConstraints({
          advanced: [{ focusMode: 'continuous' as ConstrainDOMString }],
        }).catch(() => undefined);
      }
      setCameraTips(getCameraTroubleshootingSteps());
      reportDebug({
        cameraState: 'ready',
        decoderState: 'scanning',
        note: 'Camera đã sẵn sàng, bắt đầu quét.',
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        try {
          await videoRef.current.play();
        } catch {
          setNeedsPlaybackGesture(true);
          setScanState('idle');
          reportDebug({
            scanState: 'idle',
            cameraState: 'playback_blocked',
            decoderState: 'idle',
            note: 'Trình duyệt yêu cầu thao tác tay để bật camera.',
          });
          return;
        }

        if (zxingReaderRef.current) {
          try {
            reportDebug({
              decoderEngine: 'zxing',
              decoderState: 'scanning',
            note: 'Đang quét bằng ZXing. Hệ thống sẽ mở thêm dự phòng nếu cần.',
            });
            zxingControlsRef.current = await zxingReaderRef.current.decodeFromVideoElement(
              videoRef.current,
              (result) => {
                const decodedValue = getZxingResultText(result);
                if (!decodedValue || decodedValue === lastScannedRawRef.current) {
                  return;
                }

                lastScannedRawRef.current = decodedValue;
                reportDebug({
                  decoderEngine: 'zxing',
                  decoderState: 'decoded',
                  lastDecodedRaw: decodedValue,
                  error: null,
                  note: 'ZXing đã giải mã QR.',
                });
                void submitRawValue(decodedValue);
              }
            );
          } catch {
            zxingControlsRef.current = null;
            reportDebug({
              decoderEngine: 'zxing',
              decoderState: 'error',
              note: 'ZXing không khởi động được, chuyển sang dự phòng.',
            });
          }
        }

        if (detectorRef.current || jsQrDecoderRef.current) {
          startFallbackLoop(detectorRef.current ? 'barcode-detector' : 'jsqr');
        }
      }
    } catch (err: unknown) {
      const cameraError = getCameraAccessErrorMessage(err);
      setError(cameraError);
      setCameraTips(getCameraTroubleshootingSteps(err));
      setScanState('error');
      reportDebug({
        scanState: 'error',
        cameraState: 'error',
        decoderState: 'error',
        error: cameraError,
        note: 'Không mở được camera.',
      });
    }
  }

  async function enablePlayback() {
    if (!videoRef.current) return;

    setError(null);
    setNeedsPlaybackGesture(false);
    setScanState('scanning');

    try {
      await videoRef.current.play();
    } catch (err: unknown) {
      const playbackError = getCameraAccessErrorMessage(err);
      setError(playbackError);
      setCameraTips(getCameraTroubleshootingSteps(err));
      setNeedsPlaybackGesture(true);
      setScanState('error');
      reportDebug({
        scanState: 'error',
        cameraState: 'error',
        decoderState: 'error',
        error: playbackError,
        note: 'Bật camera thất bại sau khi người dùng đã thao tác tay.',
      });
      return;
    }

    if (runtimeQrScannerFactoryRef.current) {
      try {
        runtimeQrScannerRef.current = runtimeQrScannerFactoryRef.current.create({
          video: videoRef.current,
          onDecode: (decodedValue) => {
            if (!decodedValue || decodedValue === lastScannedRawRef.current) {
              return;
            }

            lastScannedRawRef.current = decodedValue;
            reportDebug({
              decoderEngine: 'qr-scanner',
              decoderState: 'decoded',
              lastDecodedRaw: decodedValue,
              error: null,
              note: 'qr-scanner đã giải mã QR.',
            });
            void submitRawValue(decodedValue);
          },
          onDecodeError: (decodeError) => {
            const message =
              decodeError instanceof Error ? decodeError.message : String(decodeError || '');
            if (!message) {
              return;
            }

            reportDebug({
              decoderEngine: 'qr-scanner',
              decoderState: 'scanning',
              note: `qr-scanner đang bỏ qua lỗi tạm thời: ${message}`,
            });
          },
        });
        await runtimeQrScannerRef.current.start();
        reportDebug({
          decoderEngine: 'qr-scanner',
          cameraState: 'ready',
          decoderState: 'scanning',
          error: null,
          note: 'Đã bật camera bằng thao tác tay, qr-scanner đang quét liên tục.',
        });

        if (detectorRef.current || jsQrDecoderRef.current) {
          armFallbackLoop(detectorRef.current ? 'barcode-detector' : 'jsqr');
        }
        return;
      } catch (runtimeErr: unknown) {
        try {
          runtimeQrScannerRef.current?.destroy();
        } catch {}
        runtimeQrScannerRef.current = null;
        reportDebug({
          decoderEngine: 'qr-scanner',
          decoderState: 'error',
          note: `qr-scanner không khởi động được sau thao tác tay, chuyển sang dự phòng. ${
            runtimeErr instanceof Error ? runtimeErr.message : ''
          }`.trim(),
        });
      }
    }

    if (zxingReaderRef.current) {
      try {
        reportDebug({
          decoderEngine: 'zxing',
          cameraState: 'ready',
          decoderState: 'scanning',
          error: null,
          note: 'Đã bật camera bằng thao tác tay, đang quét bằng ZXing và sẽ mở dự phòng nếu cần.',
        });
        zxingControlsRef.current = await zxingReaderRef.current.decodeFromVideoElement(
          videoRef.current,
          (result) => {
            const decodedValue = getZxingResultText(result);
            if (!decodedValue || decodedValue === lastScannedRawRef.current) {
              return;
            }

            lastScannedRawRef.current = decodedValue;
            reportDebug({
              decoderEngine: 'zxing',
              decoderState: 'decoded',
              lastDecodedRaw: decodedValue,
              error: null,
              note: 'ZXing đã giải mã QR.',
            });
            void submitRawValue(decodedValue);
          }
        );
      } catch {
        zxingControlsRef.current = null;
        reportDebug({
          decoderEngine: 'zxing',
          decoderState: 'error',
          note: 'ZXing không khởi động được sau thao tác tay, chuyển sang dự phòng.',
        });
      }
    }

    if (detectorRef.current || jsQrDecoderRef.current) {
      startFallbackLoop(detectorRef.current ? 'barcode-detector' : 'jsqr');
    }
  }

  useEffect(() => {
    if (scanState !== 'scanning') {
      return;
    }

    const interval = window.setInterval(() => {
      const now = Date.now();
      if (
        scanStartedAtRef.current > 0 &&
        now - scanStartedAtRef.current >= NO_RESULT_NOTICE_MS &&
        now - lastNoResultNoticeAtRef.current >= NO_RESULT_NOTICE_MS &&
        !submittingRef.current
      ) {
        if (!frameRequest.current && (detectorRef.current || jsQrDecoderRef.current)) {
          startFallbackLoop(detectorRef.current ? 'barcode-detector' : 'jsqr');
        }
        lastNoResultNoticeAtRef.current = now;
        setError('Chưa nhận được mã QR. Hãy đưa camera vào mã QR ở khoảng cách gần hơn.');
        reportDebug({
          decoderState: 'timeout',
          error: 'Chưa nhận được mã QR. Hãy đưa camera vào mã QR ở khoảng cách gần hơn.',
          note: 'Đã quá vài giây nhưng chưa đọc được mã QR.',
        });
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [scanState]);

  function tick() {
    if (!videoRef.current || !canvasRef.current) {
      frameRequest.current = requestAnimationFrame(tick);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context || video.readyState !== 4) {
      frameRequest.current = requestAnimationFrame(tick);
      return;
    }

    decodeCycleRef.current += 1;
    const useFullFrame = decodeCycleRef.current % 2 === 0;
    const cropZoom =
      decodeCycleRef.current % 5 === 0
        ? 0.8
        : decodeCycleRef.current % 3 === 0
          ? 0.9
          : 1;
    const frameReady = useFullFrame
      ? drawFullFrame(video, canvas, context)
      : drawCenteredSquareFrame(video, canvas, context, cropZoom);
    if (!frameReady) {
      frameRequest.current = requestAnimationFrame(tick);
      return;
    }

    const now = Date.now();
    const shouldDecode = now - lastDecodeAtRef.current >= DECODE_INTERVAL_MS;
    if (shouldDecode && !submittingRef.current && !processingFrameRef.current) {
      lastDecodeAtRef.current = now;
      processingFrameRef.current = true;
      const elapsed = now - scanStartedAtRef.current;
      const shouldUseAggressiveMode =
        elapsed <= 2500 || useFullFrame || decodeCycleRef.current % 3 === 0 || elapsed >= 6000;

      void (async () => {
        return decodeQrValueFromSource({
          source: canvas,
          barcodeDetector: detectorRef.current,
          jsQrDecoder: jsQrDecoderRef.current,
          aggressive: shouldUseAggressiveMode,
          getFallbackImageData: () => {
            try {
              return context.getImageData(0, 0, canvas.width, canvas.height);
            } catch {
              return null;
            }
          },
        });
      })()
        .then(async (decodedValue) => {
          const firstValue = String(decodedValue || '').trim();
          if (!firstValue || firstValue === lastScannedRawRef.current) {
            return;
          }

          lastScannedRawRef.current = firstValue;
          reportDebug({
            decoderEngine: detectorRef.current ? 'barcode-detector' : 'jsqr',
            decoderState: 'decoded',
            lastDecodedRaw: firstValue,
            error: null,
            note: 'Bộ quét dự phòng đã giải mã QR.',
          });
          await submitRawValue(firstValue);
        })
        .catch(() => undefined)
        .finally(() => {
          processingFrameRef.current = false;
        });
    }

    frameRequest.current = requestAnimationFrame(tick);
  }

  async function submitRawValue(rawValue: string) {
    if (submittingRef.current) return;
    submittingRef.current = true;

    try {
      setScanState('scanning');
      setError(null);
      reportDebug({
        scanState: 'scanning',
        decoderState: 'decoded',
        lastDecodedRaw: rawValue,
        error: null,
        note: 'Đã đọc được mã QR, đang gửi yêu cầu điểm danh.',
      });
      await onScan(rawValue);
      setLastResult(rawValue);
      stopScan('success');
      toast.success('Điểm danh thành công');
    } catch (err: unknown) {
      const submitError = err instanceof Error ? err.message : 'Xác thực thất bại';
      setScanState('error');
      lastScannedRawRef.current = '';
      setError(submitError);
      reportDebug({
        scanState: 'error',
        decoderState: 'error',
        error: submitError,
        note: 'Đã đọc được mã QR nhưng xác thực điểm danh thất bại.',
      });
      toast.error('Không thể điểm danh. Vui lòng quét lại mã QR tại lớp.');
    } finally {
      submittingRef.current = false;
    }
  }

  return (
    <div className="space-y-5">
      <section className="content-card overflow-hidden pb-[calc(env(safe-area-inset-bottom)+0.25rem)] dark:border-slate-700 dark:bg-slate-900/70">
        <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700 sm:px-5">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 sm:text-lg">
            Quét mã QR điểm danh
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Theo quy định, học viên bắt buộc dùng camera web để quét lại mã QR tại lớp mới được điểm
            danh.
          </p>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          <div className="grid gap-2 rounded-2xl border border-blue-200 bg-blue-50/70 p-3 text-xs text-blue-900 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-100 sm:grid-cols-2 sm:items-center sm:px-4">
            <div className="inline-flex items-center gap-2 font-semibold">
              <ScanLine className="h-4 w-4" />
              Trạng thái: {scanStateLabel}
            </div>
            <div className="text-[11px] leading-5 text-blue-800 dark:text-blue-200 sm:text-right">
              {scanStateHint}
            </div>
          </div>

          <div className="relative mx-auto aspect-square w-full max-w-[25rem] overflow-hidden rounded-2xl border border-slate-200 bg-black/95 shadow-inner shadow-black/40 dark:border-slate-600">
            <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
            <div className="pointer-events-none absolute inset-0 p-4 sm:p-5">
              <div className="relative h-full w-full">
                <div className="absolute left-0 top-0 h-9 w-9 rounded-tl-2xl border-l-4 border-t-4 border-cyan-300/95" />
                <div className="absolute right-0 top-0 h-9 w-9 rounded-tr-2xl border-r-4 border-t-4 border-cyan-300/95" />
                <div className="absolute bottom-0 left-0 h-9 w-9 rounded-bl-2xl border-b-4 border-l-4 border-cyan-300/95" />
                <div className="absolute bottom-0 right-0 h-9 w-9 rounded-br-2xl border-b-4 border-r-4 border-cyan-300/95" />
              </div>
            </div>
            {needsPlaybackGesture && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 px-4">
                <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-slate-950/85 p-4 text-white shadow-xl backdrop-blur">
                  <div className="text-sm font-semibold">Trình duyệt đang chặn bật camera tự động</div>
                  <div className="mt-1 text-xs text-slate-200">
                    Nhấn nút bên dưới để bật camera. Hệ thống chỉ chấp nhận điểm danh sau khi quét QR
                    bằng camera web.
                  </div>
                  <button
                    type="button"
                    onClick={() => void enablePlayback()}
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                    data-testid="qr-enable-camera"
                  >
                    Bật camera
                  </button>
                </div>
              </div>
            )}
          </div>
          <canvas ref={canvasRef} className="hidden" />

          {!autoScanSupported && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
              Trình duyệt hiện tại không hỗ trợ quét QR bằng camera web. Vui lòng dùng Chrome, Edge
              hoặc Safari mới nhất.
            </div>
          )}

          {insecureContext && (
            <div
              className="rounded-2xl border border-amber-300 bg-amber-50 px-3 py-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200"
              data-testid="qr-insecure-context-guide"
            >
              <div className="font-semibold">Camera web bị chặn trên kết nối không bảo mật</div>
              <p className="mt-1 text-xs leading-5">
                Hãy mở hệ thống bằng <code>https://</code> hoặc <code>http://localhost</code>, sau đó
                bật camera và quét lại mã QR trong trang này.
              </p>
            </div>
          )}

          {scanState === 'success' && (
            <div className="rounded-2xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800 dark:border-green-500/40 dark:bg-green-500/10 dark:text-green-200" aria-live="polite">
              <div className="inline-flex items-center gap-2 font-medium">
                <CheckCircle2 className="h-4 w-4" />
                Đã xác thực
              </div>
              <div className="mt-1 break-all">{lastResult.slice(0, 52)}...</div>
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200" aria-live="polite">
              <div className="inline-flex items-center gap-2 font-medium">
                <CircleAlert className="h-4 w-4" />
                Lỗi camera hoặc quét QR
              </div>
              <div className="mt-1">{error}</div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
            <button
              type="button"
              onClick={() => void startScan()}
              disabled={cameraButtonDisabled}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-blue-300 dark:focus-visible:ring-offset-slate-900 disabled:cursor-not-allowed disabled:bg-blue-300 sm:w-auto"
            >
              <RotateCcw className="h-4 w-4" />
              {scanState === 'idle' ? 'Bật camera' : 'Quét lại'}
            </button>
            <button
              type="button"
              onClick={() => stopScan('idle')}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:focus-visible:ring-slate-500 dark:focus-visible:ring-offset-slate-900 sm:w-auto"
            >
              <Pause className="h-4 w-4" />
              Tạm dừng
            </button>
          </div>

          <div className="rounded-2xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-100">
            <div className="inline-flex items-center gap-2 font-semibold">
              <Info className="h-4 w-4" />
              Hướng dẫn nhanh
            </div>
            <ul className="sr-only">
              {cameraTips.map((tip) => (
                <li key={tip} className="leading-5">
                  • {tip}
                </li>
              ))}
            </ul>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {cameraTips.map((tip) => (
                <li key={`${tip}-clean`} className="leading-5">
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
