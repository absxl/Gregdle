/**
 * Client-side image compression for background uploads (D30): backgrounds
 * are decorative behind a heavy dim veil, so we downscale to at most
 * 1920px wide and re-encode as JPEG before uploading — typically 5-10x
 * smaller than the picked file. Keeps the Supabase free-tier storage quota
 * healthy.
 */

const MAX_WIDTH = 1920;
const TARGET_BYTES = 500 * 1024; // aim: <= 500 KB stored per background
const QUALITY_STEPS = [0.85, 0.78, 0.7, 0.6] as const;

/** Pure quality-picker: first quality whose estimated size fits the target. */
export function pickQuality(
  estimatedSizesAtSteps: readonly number[],
  target = TARGET_BYTES,
): number {
  for (let i = 0; i < estimatedSizesAtSteps.length && i < QUALITY_STEPS.length; i++) {
    if (estimatedSizesAtSteps[i]! <= target) return QUALITY_STEPS[i]!;
  }
  return QUALITY_STEPS[QUALITY_STEPS.length - 1]!;
}

export interface CompressedImage {
  blob: Blob;
  width: number;
  height: number;
}

/**
 * Decode a picked image file, downscale to <= MAX_WIDTH (never upscale),
 * and encode as JPEG within the byte target. Rejects undecodable files.
 */
export async function compressBackground(file: File): Promise<CompressedImage> {
  const bitmap = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("unreadable image"));
    img.src = URL.createObjectURL(file);
  });

  const scale = Math.min(1, MAX_WIDTH / bitmap.naturalWidth);
  const width = Math.max(1, Math.round(bitmap.naturalWidth * scale));
  const height = Math.max(1, Math.round(bitmap.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, width, height);
  URL.revokeObjectURL(bitmap.src);

  // Try decreasing quality until we fit the byte target (or run out of steps).
  let out = await toBlob(canvas, QUALITY_STEPS[0]);
  for (const q of QUALITY_STEPS) {
    const candidate = await toBlob(canvas, q);
    if (candidate.size <= TARGET_BYTES) {
      out = candidate;
      break;
    }
    if (candidate.size < out.size) out = candidate;
  }
  return { blob: out, width, height };
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("encode failed"))),
      "image/jpeg",
      quality,
    );
  });
}
