const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;

export type PngValidationResult = {
  valid: boolean;
  reason?: string;
};

function hasPngExtension(filename: string): boolean {
  return /\.png$/i.test(filename);
}

function hasPngMimeType(mimeType: string): boolean {
  return mimeType === "image/png" || mimeType === "image/x-png";
}

function hasPngSignature(bytes: Uint8Array): boolean {
  if (bytes.length < PNG_SIGNATURE.length) return false;
  for (let index = 0; index < PNG_SIGNATURE.length; index += 1) {
    if (bytes[index] !== PNG_SIGNATURE[index]) return false;
  }
  return true;
}

export async function validatePngFile(file: File): Promise<PngValidationResult> {
  if (!hasPngExtension(file.name)) {
    return { valid: false, reason: "File extension must be .png" };
  }

  if (!hasPngMimeType(file.type)) {
    return { valid: false, reason: "File MIME type must be image/png" };
  }

  try {
    const header = new Uint8Array(await file.slice(0, PNG_SIGNATURE.length).arrayBuffer());
    if (!hasPngSignature(header)) {
      return { valid: false, reason: "File content is not a valid PNG signature" };
    }
  } catch {
    return { valid: false, reason: "Could not verify file content" };
  }

  return { valid: true };
}
