export interface ClientImageCompressionOptions {
  maxWidth: number;
  maxHeight: number;
  quality: number; // 0..1
  mimeType: 'image/webp' | 'image/jpeg';
  minBytesToCompress: number;
}

export interface ClientImageCompressionResult {
  file: File;
  didCompress: boolean;
  originalSizeBytes: number;
  finalSizeBytes: number;
  width: number;
  height: number;
}

function fitWithin(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  if (width <= maxWidth && height <= maxHeight) return { width, height };
  const ratio = Math.min(maxWidth / width, maxHeight / height);
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

async function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error('Falha ao gerar blob da imagem'));
        else resolve(blob);
      },
      mimeType,
      quality
    );
  });
}

/**
 * Compressão client-side (resize + encode) para reduzir storage/banda.
 * Observação: isso remove EXIF/metadata na prática pois re-encoda via Canvas.
 */
export async function compressImageFileIfNeeded(
  input: File,
  options: ClientImageCompressionOptions
): Promise<ClientImageCompressionResult> {
  const originalSizeBytes = input.size;

  const isSupported =
    input.type === 'image/jpeg' ||
    input.type === 'image/jpg' ||
    input.type === 'image/png' ||
    input.type === 'image/webp';

  if (!isSupported || originalSizeBytes < options.minBytesToCompress) {
    const bmp = await createImageBitmap(input);
    return {
      file: input,
      didCompress: false,
      originalSizeBytes,
      finalSizeBytes: originalSizeBytes,
      width: bmp.width,
      height: bmp.height,
    };
  }

  const bitmap = await createImageBitmap(input);
  const target = fitWithin(bitmap.width, bitmap.height, options.maxWidth, options.maxHeight);

  // Se não precisa reduzir dimensões, ainda assim podemos recomprimir (p/ WebP)
  const canvas = document.createElement('canvas');
  canvas.width = target.width;
  canvas.height = target.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas não suportado para compressão');

  ctx.drawImage(bitmap, 0, 0, target.width, target.height);

  const blob = await canvasToBlob(canvas, options.mimeType, options.quality);
  const finalSizeBytes = blob.size;

  // Se ficou maior ou a economia é muito pequena, mantém o original.
  // (Evita piorar storage/banda em casos raros.)
  const savingsRatio = finalSizeBytes / originalSizeBytes;
  const didCompress = savingsRatio < 0.95 || target.width !== bitmap.width || target.height !== bitmap.height;

  if (!didCompress || finalSizeBytes >= originalSizeBytes) {
    return {
      file: input,
      didCompress: false,
      originalSizeBytes,
      finalSizeBytes: originalSizeBytes,
      width: bitmap.width,
      height: bitmap.height,
    };
  }

  const ext = options.mimeType === 'image/webp' ? 'webp' : 'jpg';
  const baseName = input.name.replace(/\.[^/.]+$/, '');
  const outName = `${baseName}.${ext}`;
  const outFile = new File([blob], outName, { type: options.mimeType, lastModified: Date.now() });

  return {
    file: outFile,
    didCompress: true,
    originalSizeBytes,
    finalSizeBytes,
    width: target.width,
    height: target.height,
  };
}
