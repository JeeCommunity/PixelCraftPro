import { encode as encodeJpeg } from '@jsquash/jpeg';
import { optimise as encodePng } from '@jsquash/oxipng';
import { encode as encodeWebp } from '@jsquash/webp';

export interface CompressionResult {
  blob: Blob;
  size: number;
  width: number;
  height: number;
  codec: string;
  format: string;
  targetReached: boolean;
  iterations: number;
}

export async function compressImageWithJSquash(
  img: HTMLImageElement,
  originalWidth: number,
  originalHeight: number,
  mimeType: string,
  targetBytes: number | null, // null means use quality mode
  qualityModeValue: number = 80 // 1-100
): Promise<CompressionResult> {
  let format = mimeType;
  if (!format.startsWith('image/')) format = 'image/jpeg';
  if (format === 'image/jpg') format = 'image/jpeg';

  let codec = 'MozJPEG';
  if (format === 'image/png') codec = 'OxiPNG';
  else if (format === 'image/webp') codec = 'libwebp';

  let currentW = originalWidth;
  let currentH = originalHeight;

  // Helper to get ImageData at current dimensions
  const getImageDataForDimensions = (w: number, h: number): ImageData => {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context failed');

    if (format === 'image/jpeg') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, w, h);
    }
    ctx.drawImage(img, 0, 0, w, h);
    return ctx.getImageData(0, 0, w, h);
  };

  let iterations = 0;
  let bestBuffer: ArrayBuffer | Uint8Array | null = null;
  let bestSize = Infinity;
  let bestW = currentW;
  let bestH = currentH;
  let targetReached = false;

  // Quality Mode
  if (targetBytes === null) {
    const qNorm = Math.max(5, Math.min(95, qualityModeValue));
    const imageData = getImageDataForDimensions(currentW, currentH);

    if (format === 'image/jpeg') {
      bestBuffer = await encodeJpeg(imageData, { quality: qNorm });
      codec = 'MozJPEG';
    } else if (format === 'image/webp') {
      bestBuffer = await encodeWebp(imageData, { quality: qNorm });
      codec = 'libwebp';
    } else {
      bestBuffer = await encodePng(imageData);
      codec = 'OxiPNG';
    }

    const outBlob = new Blob([bestBuffer as any], { type: format });
    return {
      blob: outBlob,
      size: outBlob.size,
      width: currentW,
      height: currentH,
      codec,
      format,
      targetReached: true,
      iterations: 1,
    };
  }

  // Target Size Mode (Binary search quality + dimension reduction fallback)
  let scale = 1.0;
  let candidates: { buffer: ArrayBuffer | Uint8Array; size: number; w: number; h: number }[] = [];

  for (let scaleStep = 0; scaleStep < 6 && scale >= 0.2; scaleStep++) {
    const testW = Math.max(80, Math.round(originalWidth * scale));
    const testH = Math.max(80, Math.round(originalHeight * scale));
    const imageData = getImageDataForDimensions(testW, testH);

    if (format === 'image/png') {
      iterations++;
      const buf = await encodePng(imageData);
      const size = buf.byteLength;
      candidates.push({ buffer: buf, size, w: testW, h: testH });
      if (size <= targetBytes) {
        targetReached = true;
        break;
      }
    } else {
      // Binary search quality [10, 95]
      let low = 10;
      let high = 95;
      let bestQBuf: ArrayBuffer | Uint8Array | null = null;
      let bestQSize = Infinity;

      for (let qStep = 0; qStep < 5; qStep++) {
        iterations++;
        const midQ = Math.round((low + high) / 2);
        let buf: ArrayBuffer | Uint8Array;
        if (format === 'image/webp') {
          buf = await encodeWebp(imageData, { quality: midQ });
        } else {
          buf = await encodeJpeg(imageData, { quality: midQ });
        }
        const size = buf.byteLength;
        candidates.push({ buffer: buf, size, w: testW, h: testH });

        if (size <= targetBytes) {
          if (size > bestQSize || bestQBuf === null) {
            bestQBuf = buf;
            bestQSize = size;
          }
          low = midQ + 1;
        } else {
          high = midQ - 1;
        }
      }

      const validForScale = candidates.filter(c => c.w === testW && c.size <= targetBytes);
      if (validForScale.length > 0) {
        targetReached = true;
        break;
      }
    }

    scale *= 0.85; // downscale for next iteration if target not reached
  }

  // Choose best candidate: among all candidates <= targetBytes, pick the largest size (best quality).
  // If none <= targetBytes, pick the absolute smallest candidate available.
  const validCandidates = candidates.filter(c => c.size <= targetBytes);
  let chosen = validCandidates.length > 0
    ? validCandidates.reduce((prev, curr) => (curr.size > prev.size ? curr : prev))
    : candidates.reduce((prev, curr) => (curr.size < prev.size ? curr : prev));

  if (!chosen) {
    // Fallback encode at lowest quality
    const imageData = getImageDataForDimensions(Math.round(originalWidth * 0.3), Math.round(originalHeight * 0.3));
    const buf = format === 'image/webp' ? await encodeWebp(imageData, { quality: 10 }) : await encodeJpeg(imageData, { quality: 10 });
    chosen = { buffer: buf, size: buf.byteLength, w: Math.round(originalWidth * 0.3), h: Math.round(originalHeight * 0.3) };
  }

  const finalBlob = new Blob([chosen.buffer as any], { type: format });
  return {
    blob: finalBlob,
    size: finalBlob.size,
    width: chosen.w,
    height: chosen.h,
    codec,
    format,
    targetReached: finalBlob.size <= targetBytes,
    iterations,
  };
}
