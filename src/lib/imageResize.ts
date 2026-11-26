export interface ResizedImageResult {
  blob: Blob;
  previewDataUrl: string;
  originalBytes: number;
  resizedBytes: number;
  width: number;
  height: number;
  extension: string;
}

const MAX_TARGET_BYTES = 950 * 1024; // Strictly under 1 MB

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not decode selected image file.'));
    };
    img.src = objectUrl;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to encode resized image.'));
          return;
        }
        resolve(blob);
      },
      mimeType,
      quality,
    );
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Failed to read image preview.'));
    reader.readAsDataURL(blob);
  });
}

export async function resizeImageUnder1MB(file: File): Promise<ResizedImageResult> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose a valid image file (JPEG, PNG, or WebP).');
  }

  const img = await loadImageFromFile(file);
  const maxInitialEdge = 1600;
  let scale = Math.min(1, maxInitialEdge / Math.max(img.naturalWidth, img.naturalHeight));

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Browser canvas rendering is unavailable.');
  }

  let quality = 0.85;
  let blob: Blob | null = null;
  let targetWidth = Math.max(1, Math.round(img.naturalWidth * scale));
  let targetHeight = Math.max(1, Math.round(img.naturalHeight * scale));

  for (let attempt = 0; attempt < 8; attempt++) {
    targetWidth = Math.max(1, Math.round(img.naturalWidth * scale));
    targetHeight = Math.max(1, Math.round(img.naturalHeight * scale));
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    ctx.clearRect(0, 0, targetWidth, targetHeight);
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    blob = await canvasToBlob(canvas, 'image/jpeg', quality);
    if (blob.size <= MAX_TARGET_BYTES) {
      break;
    }

    if (quality > 0.55) {
      quality = Math.max(0.5, quality - 0.12);
    } else {
      scale *= 0.78;
    }
  }

  if (!blob || blob.size > 1024 * 1024) {
    throw new Error('Image could not be compressed below 1 MB. Please choose a smaller photo.');
  }

  const previewDataUrl = await blobToDataUrl(blob);
  return {
    blob,
    previewDataUrl,
    originalBytes: file.size,
    resizedBytes: blob.size,
    width: targetWidth,
    height: targetHeight,
    extension: 'jpg',
  };
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',');
  const mimeMatch = header.match(/data:(.*?);base64/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
