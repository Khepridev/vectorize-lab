import { describe, expect, it } from "vitest";
import { validatePngFile } from "@/lib/fileValidation";

function makeFile(bytes: number[], name: string, type: string): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

describe("validatePngFile", () => {
  it("accepts a valid png by extension, mime, and signature", async () => {
    const validPngHeader = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    const file = makeFile(validPngHeader, "icon.png", "image/png");

    const result = await validatePngFile(file);
    expect(result.valid).toBe(true);
  });

  it("rejects files with a wrong extension", async () => {
    const validPngHeader = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    const file = makeFile(validPngHeader, "icon.jpg", "image/png");

    const result = await validatePngFile(file);
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/extension/i);
  });

  it("rejects files with a wrong signature", async () => {
    const wrongHeader = [0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77];
    const file = makeFile(wrongHeader, "icon.png", "image/png");

    const result = await validatePngFile(file);
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/signature/i);
  });
});
