import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { DownloadButton } from "@/components/DownloadButton";

describe("DownloadButton", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a downloadable link on click", () => {
    const createObjectURL = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:http://localhost/file");
    const revokeObjectURL = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

    render(<DownloadButton svgString="<svg />" filename="sample.svg" />);
    fireEvent.click(screen.getByRole("button", { name: /download svg/i }));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:http://localhost/file");
  });
});
