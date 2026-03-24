import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cropImageToDataUrl } from '../../lib/imageCrop';

const CROP_ASPECT = 4 / 5;
const CROP_WIDTH = 280;
const CROP_HEIGHT = Math.round(CROP_WIDTH / CROP_ASPECT); // 350

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
  const dragStartRef = useRef<Point>({ x: 0, y: 0 });
  const dragOffsetStartRef = useRef<Point>({ x: 0, y: 0 });

  useEffect(() => {
    if (!open || !imageSrc) return;
    setZoom(1);
    setOffset({ x: 0, y: 0 });
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
        { width: 1200, height: 1500 },
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
              Drag to position and use zoom. Final crop is 4:5.
            </p>

            <div className="mx-auto rounded-xl overflow-hidden" style={{ width: CROP_WIDTH, height: CROP_HEIGHT, background: '#0A0A1E' }}>
              <div
                className="relative w-full h-full touch-none cursor-grab active:cursor-grabbing"
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
                    objectFit: 'cover',
                  }}
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
