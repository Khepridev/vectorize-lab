import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Dropzone } from "@/components/Dropzone";

describe("Dropzone", () => {
  it("calls onFileSelect when user chooses a file", async () => {
    const onFileSelect = vi.fn().mockResolvedValue(undefined);
    render(<Dropzone onFileSelect={onFileSelect} isProcessing={false} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File([new Uint8Array([1, 2, 3])], "image.png", { type: "image/png" });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(onFileSelect).toHaveBeenCalledTimes(1);
      expect(onFileSelect).toHaveBeenCalledWith(file);
    });
  });

  it("shows processing label while disabled", () => {
    render(<Dropzone onFileSelect={vi.fn()} isProcessing />);
    expect(screen.getByText("Processing...")).toBeInTheDocument();
  });
});
