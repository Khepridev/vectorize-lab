import { describe, expect, it } from "vitest";
import { sanitizeSvg } from "@/lib/sanitizeSvg";

describe("sanitizeSvg", () => {
  it("removes script tags and inline event handlers", () => {
    const input =
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><rect width="10" height="10" onclick="alert(2)" /></svg>';

    const output = sanitizeSvg(input);

    expect(output).not.toContain("<script");
    expect(output).not.toContain("onclick=");
    expect(output).toContain("<rect");
  });

  it("removes javascript href payloads", () => {
    const input =
      '<svg xmlns="http://www.w3.org/2000/svg"><a href="javascript:alert(1)"><text>Click</text></a></svg>';

    const output = sanitizeSvg(input);

    expect(output).not.toContain("javascript:");
    expect(output).toContain("<text>Click</text>");
  });
});
