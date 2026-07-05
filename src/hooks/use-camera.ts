import { useCallback, useEffect, useRef, useState } from "react";

export type FacingMode = "user" | "environment";

interface UseCameraOptions {
  facingMode?: FacingMode;
}

interface UseCameraReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  stream: MediaStream | null;
  isLoading: boolean;
  error: string | null;
  isSupported: boolean;
  isDenied: boolean;
  start: () => Promise<void>;
  stop: () => void;
  switchCamera: () => Promise<void>;
  capturePhoto: () => string | null;
}

export function useCamera(options: UseCameraOptions = {}): UseCameraReturn {
  const { facingMode = "environment" } = options;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDenied, setIsDenied] = useState(false);
  const [currentFacingMode, setCurrentFacingMode] = useState<FacingMode>(facingMode);

  const isSupported =
    typeof navigator !== "undefined" &&
    "mediaDevices" in navigator &&
    "getUserMedia" in navigator.mediaDevices;

  const stop = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [stream]);

  const start = useCallback(async () => {
    if (!isSupported) {
      setError("Câmera não suportada neste dispositivo");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: currentFacingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      setStream(mediaStream);
      setIsDenied(false);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      const cameraError = err as Error;
      if (cameraError.name === "NotAllowedError" || cameraError.name === "PermissionDeniedError") {
        setIsDenied(true);
        setError("Permissão de câmera negada");
      } else if (cameraError.name === "NotFoundError") {
        setError("Nenhuma câmera encontrada neste dispositivo");
      } else {
        setError("Falha ao acessar câmera");
      }
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, currentFacingMode]);

  const switchCamera = useCallback(async () => {
    stop();
    setCurrentFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  }, [stop]);

  useEffect(() => {
    if (stream) {
      void start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFacingMode]);

  const capturePhoto = useCallback((): string | null => {
    if (!videoRef.current || !stream) return null;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.85);
  }, [stream]);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  return { videoRef, stream, isLoading, error, isSupported, isDenied, start, stop, switchCamera, capturePhoto };
}
