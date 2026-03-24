import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  PHOTO_CROP_EXPORT_HEIGHT_PX,
  PHOTO_CROP_EXPORT_WIDTH_PX,
  PHOTO_CROP_PREVIEW_HEIGHT_PX,
  PHOTO_CROP_PREVIEW_MAX_WIDTH_PX,
  PHOTO_CROP_PREVIEW_RENDER_HEIGHT_PX,
  PHOTO_CROP_PREVIEW_RENDER_WIDTH_PX,
  PHOTO_CROP_VIEWPORT_HEIGHT_PX,
  PHOTO_CROP_VIEWPORT_WIDTH_PX,
} from '../../lib/discoverCardConstants';
import { cropImageToDataUrl } from '../../lib/imageCrop';

const CROP_WIDTH = PHOTO_CROP_VIEWPORT_WIDTH_PX;
const CROP_HEIGHT = PHOTO_CROP_VIEWPORT_HEIGHT_PX;

interface Point {
  x: number;
  y: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function PhotoCropModal({
  open,
  imageSrc,
  onCancel,
  onConfirm,
  title = 'Crop photo',
}: {
  open: boolean;
  imageSrc: string | null;
  onCancel: () => void;
  onConfirm: (croppedDataUrl: string) => void;
  title?: string;
}) {
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const dragStartRef = useRef<Point>({ x: 0, y: 0 });
  const dragOffsetStartRef = useRef<Point>({ x: 0, y: 0 });

  useEffect(() => {
    if (!open || !imageSrc) return;
    if (import.meta.env.DEV) {
      console.log('[PhotoCropModal] opened with image');
    }
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setPreviewDataUrl(null);
    const img = new Image();
    img.onload = () => {
      setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = imageSrc;
  }, [open, imageSrc]);

  const baseScale = useMemo(() => {
    if (!naturalSize) return 1;
    return Math.max(CROP_WIDTH / naturalSize.width, CROP_HEIGHT / naturalSize.height);
  }, [naturalSize]);

  const totalScale = baseScale * zoom;
  const displayWidth = (naturalSize?.width ?? CROP_WIDTH) * totalScale;
  const displayHeight = (naturalSize?.height ?? CROP_HEIGHT) * totalScale;

  const offsetLimits = useMemo(() => {
    const maxX = Math.max(0, (displayWidth - CROP_WIDTH) / 2);
    const maxY = Math.max(0, (displayHeight - CROP_HEIGHT) / 2);
    return { minX: -maxX, maxX, minY: -maxY, maxY };
  }, [displayHeight, displayWidth]);

  const clampedOffset = useMemo(
    () => ({
      x: clamp(offset.x, offsetLimits.minX, offsetLimits.maxX),
      y: clamp(offset.y, offsetLimits.minY, offsetLimits.maxY),
    }),
    [offset.x, offset.y, offsetLimits.maxX, offsetLimits.maxY, offsetLimits.minX, offsetLimits.minY],
  );

  useEffect(() => {
    if (!open || !imageSrc || !naturalSize) return;
    let cancelled = false;
    const t = setTimeout(() => {
      const imageLeft = (CROP_WIDTH - displayWidth) / 2 + clampedOffset.x;
      const imageTop = (CROP_HEIGHT - displayHeight) / 2 + clampedOffset.y;
      const cropX = (0 - imageLeft) / totalScale;
      const cropY = (0 - imageTop) / totalScale;
      const cropW = CROP_WIDTH / totalScale;
      const cropH = CROP_HEIGHT / totalScale;
      void (async () => {
        try {
          const preview = await cropImageToDataUrl(
            imageSrc,
            { x: cropX, y: cropY, width: cropW, height: cropH },
            {
              width: PHOTO_CROP_PREVIEW_RENDER_WIDTH_PX,
              height: PHOTO_CROP_PREVIEW_RENDER_HEIGHT_PX,
            },
            0.85,
          );
          if (!cancelled) setPreviewDataUrl(preview);
        } catch {
          // best-effort preview only
        }
      })();
    }, 90);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [clampedOffset.x, clampedOffset.y, displayHeight, displayWidth, imageSrc, naturalSize, open, totalScale]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    dragOffsetStartRef.current = clampedOffset;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setOffset({
      x: clamp(dragOffsetStartRef.current.x + dx, offsetLimits.minX, offsetLimits.maxX),
      y: clamp(dragOffsetStartRef.current.y + dy, offsetLimits.minY, offsetLimits.maxY),
    });
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const handleConfirm = async () => {
    if (!imageSrc || !naturalSize || busy) return;
    setBusy(true);
    try {
      const imageLeft = (CROP_WIDTH - displayWidth) / 2 + clampedOffset.x;
      const imageTop = (CROP_HEIGHT - displayHeight) / 2 + clampedOffset.y;
      const cropX = (0 - imageLeft) / totalScale;
      const cropY = (0 - imageTop) / totalScale;
      const cropW = CROP_WIDTH / totalScale;
      const cropH = CROP_HEIGHT / totalScale;

      const cropped = await cropImageToDataUrl(
        imageSrc,
        { x: cropX, y: cropY, width: cropW, height: cropH },
        { width: PHOTO_CROP_EXPORT_WIDTH_PX, height: PHOTO_CROP_EXPORT_HEIGHT_PX },
        0.9,
      );
      onConfirm(cropped);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {open && imageSrc && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.85)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
        >
          <motion.div
            className="w-full max-w-sm rounded-2xl p-4"
            style={{
              background: 'linear-gradient(175deg, #1C1C3E 0%, #12122A 100%)',
              border: '2px solid rgba(255,255,255,0.1)',
            }}
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.94, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-display text-xl mb-3" style={{ color: '#FFE66D' }}>{title}</h2>
            <p className="font-body text-xs mb-3" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Preview before publish: adjust crop and zoom to control what matches see first.
            </p>

            {/* Crop viewport: same aspect as Discover ProfileCard photo strip. */}
            <div
              className="mx-auto rounded-xl overflow-hidden relative touch-none cursor-grab active:cursor-grabbing"
              style={{ width: CROP_WIDTH, height: CROP_HEIGHT, background: '#0A0A1E' }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
            >
              <img
                src={imageSrc}
                alt="Crop preview"
                draggable={false}
                className="absolute left-1/2 top-1/2 select-none"
                style={{
                  width: displayWidth,
                  height: displayHeight,
                  transform: `translate(calc(-50% + ${clampedOffset.x}px), calc(-50% + ${clampedOffset.y}px))`,
                  objectFit: 'fill',
                }}
              />
              {/* Frame matches export bounds */}
              <div
                className="absolute inset-0 pointer-events-none z-10 rounded-xl"
                style={{
                  boxShadow:
                    'inset 0 0 0 2px rgba(78,255,196,0.95), inset 0 0 28px rgba(0,0,0,0.28)',
                }}
                aria-hidden
              />
            </div>

            <div className="mt-4">
              <p className="font-body text-xs font-bold mb-2 text-center" style={{ color: '#4EFFC4' }}>
                This is how you'll appear on Discover
              </p>
              <div className="mx-auto rounded-2xl overflow-hidden"
                style={{
                  width: PHOTO_CROP_PREVIEW_MAX_WIDTH_PX,
                  height: PHOTO_CROP_PREVIEW_HEIGHT_PX,
                  background: 'linear-gradient(175deg, #1C1C3E 0%, #12122A 100%)',
                  border: '2px solid rgba(255,255,255,0.1)',
                  boxShadow: '0 12px 28px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.04)',
                }}>
                <img
                  src={previewDataUrl ?? imageSrc}
                  alt="Discover preview"
                  className="w-full h-full"
                  style={{ objectFit: 'fill' }}
                  draggable={false}
                />
              </div>
            </div>

            <div className="mt-3">
              <label className="font-body text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>
                Zoom
              </label>
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full mt-1"
              />
            </div>

            <div className="mt-4 flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 py-3 rounded-xl font-body text-sm font-bold"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' }}
              >
                Cancel
              </button>
              <button
                onClick={() => { void handleConfirm(); }}
                disabled={busy || !naturalSize}
                className="flex-1 py-3 rounded-xl font-body text-sm font-bold"
                style={{
                  background: 'rgba(78,255,196,0.15)',
                  border: '1.5px solid rgba(78,255,196,0.3)',
                  color: '#4EFFC4',
                  opacity: busy || !naturalSize ? 0.6 : 1,
                }}
              >
                {busy ? 'Cropping...' : 'Use Crop'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
