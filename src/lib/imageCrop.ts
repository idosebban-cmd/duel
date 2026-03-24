export interface CropPixels {
  x: number;
  y: number;
  width: number;
  height: number;
}

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
  outputSize: CropOutputSize = { width: 1200, height: 1500 },
  quality = 0.9,
): Promise<string> {
  const img = await loadImage(imageSrc);
  const sx = clamp(Math.round(crop.x), 0, Math.max(0, img.naturalWidth - 1));
  const sy = clamp(Math.round(crop.y), 0, Math.max(0, img.naturalHeight - 1));
  const sw = clamp(Math.round(crop.width), 1, img.naturalWidth - sx);
  const sh = clamp(Math.round(crop.height), 1, img.naturalHeight - sy);

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
