export interface CropPixels {
  x: number;
  y: number;
  width: number;
  height: number;
}

import {
  PHOTO_CROP_EXPORT_HEIGHT_PX,
  PHOTO_CROP_EXPORT_WIDTH_PX,
} from './discoverCardConstants';

export interface CropOutputSize {
  width: number;
  height: number;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image for cropping'));
    img.src = src;
  });
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export async function cropImageToDataUrl(
  imageSrc: string,
  crop: CropPixels,
  outputSize: CropOutputSize = {
    width: PHOTO_CROP_EXPORT_WIDTH_PX,
    height: PHOTO_CROP_EXPORT_HEIGHT_PX,
  },
  quality = 0.9,
): Promise<string> {
  const img = await loadImage(imageSrc);
  const nw = img.naturalWidth;
  const nh = img.naturalHeight;

  // Keep sub-pixel precision so the source rect matches the UI math; rounding
  // each edge independently can skew aspect ratio and clip the wrong band.
  let sx = clamp(crop.x, 0, Math.max(0, nw - 1e-6));
  let sy = clamp(crop.y, 0, Math.max(0, nh - 1e-6));
  let sw = clamp(crop.width, 1e-6, nw - sx);
  let sh = clamp(crop.height, 1e-6, nh - sy);

  if (sx + sw > nw) sw = nw - sx;
  if (sy + sh > nh) sh = nh - sy;

  const canvas = document.createElement('canvas');
  canvas.width = outputSize.width;
  canvas.height = outputSize.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not initialize canvas context');

  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outputSize.width, outputSize.height);
  return canvas.toDataURL('image/jpeg', quality);
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}
