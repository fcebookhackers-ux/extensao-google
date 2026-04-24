export type SupportedMimeType =
  | "image/jpeg"
  | "image/png"
  | "image/gif"
  | "image/webp"
  | "application/pdf"
  | "video/mp4"
  | "audio/mpeg";

type MagicBytesPattern = {
  /** Bytes to match starting at offset 0 unless offset is provided */
  bytes: number[];
  /** Optional offset where the sequence is expected (e.g. MP4 "ftyp" at 4) */
  offset?: number;
};

const MAGIC_BYTES_MAP: Record<SupportedMimeType, MagicBytesPattern[]> = {
  "image/jpeg": [
    { bytes: [0xff, 0xd8, 0xff] },
  ],
  "image/png": [
    { bytes: [0x89, 0x50, 0x4e, 0x47] }, // .PNG
  ],
  "image/gif": [
    { bytes: [0x47, 0x49, 0x46, 0x38] }, // GIF8
  ],
  "image/webp": [
    // RIFF....WEBP
    { bytes: [0x52, 0x49, 0x46, 0x46] }, // RIFF at 0
  ],
  "application/pdf": [
    { bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  ],
  "video/mp4": [
    // ftyp at offset 4 is the usual MP4 signature
    { bytes: [0x66, 0x74, 0x79, 0x70], offset: 4 },
  ],
  "audio/mpeg": [
    // ID3 tag or MPEG frame sync (0xFF 0xFB)
    { bytes: [0x49, 0x44, 0x33] },
    { bytes: [0xff, 0xfb] },
  ],
};

export function validateFileMagicBytes(
  buffer: ArrayBuffer,
  mimeType: string,
): { valid: boolean; reason?: string } {
  const view = new Uint8Array(buffer);

  const patterns = MAGIC_BYTES_MAP[mimeType as SupportedMimeType];
  if (!patterns) {
    return {
      valid: false,
      reason: `Tipo de arquivo não suportado para validação: ${mimeType}`,
    };
  }

  const matches = patterns.some((pattern) => {
    const { bytes, offset = 0 } = pattern;
    if (view.length < offset + bytes.length) return false;
    for (let i = 0; i < bytes.length; i++) {
      if (view[offset + i] !== bytes[i]) return false;
    }
    return true;
  });

  if (!matches) {
    return {
      valid: false,
      reason: "Assinatura do arquivo não corresponde ao tipo informado.",
    };
  }

  return { valid: true };
}
