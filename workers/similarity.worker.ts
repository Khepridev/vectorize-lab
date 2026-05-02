type SimilarityWorkerRequest = {
  id: number;
  file: File;
  svgString: string;
  maxSide: number;
};

type SimilarityWorkerResponse =
  | {
      id: number;
      score: number;
    }
  | {
      id: number;
      error: string;
    };

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function calculatePixelDiffScore(
  originalPixels: Uint8ClampedArray,
  vectorPixels: Uint8ClampedArray
): number {
  let totalDiff = 0;
  for (let i = 0; i < originalPixels.length; i += 4) {
    totalDiff +=
      Math.abs(originalPixels[i] - vectorPixels[i]) +
      Math.abs(originalPixels[i + 1] - vectorPixels[i + 1]) +
      Math.abs(originalPixels[i + 2] - vectorPixels[i + 2]) +
      Math.abs(originalPixels[i + 3] - vectorPixels[i + 3]);
  }

  const maxDiff = (originalPixels.length / 4) * 4 * 255;
  return clamp(100 * (1 - totalDiff / maxDiff), 0, 100);
}

const workerContext = self as unknown as {
  onmessage: ((event: MessageEvent<SimilarityWorkerRequest>) => void) | null;
  postMessage: (message: SimilarityWorkerResponse) => void;
};

workerContext.onmessage = async (event: MessageEvent<SimilarityWorkerRequest>) => {
  const { id, file, svgString, maxSide } = event.data;

  try {
    if (typeof createImageBitmap !== "function" || typeof OffscreenCanvas === "undefined") {
      throw new Error("Worker image APIs are unavailable.");
    }

    const originalBitmap = await createImageBitmap(file);
    const svgBlob = new Blob([svgString], { type: "image/svg+xml" });
    const svgBitmap = await createImageBitmap(svgBlob);

    const scale = Math.min(1, maxSide / Math.max(originalBitmap.width, originalBitmap.height));
    const width = Math.max(1, Math.round(originalBitmap.width * scale));
    const height = Math.max(1, Math.round(originalBitmap.height * scale));

    const originalCanvas = new OffscreenCanvas(width, height);
    const originalCtx = originalCanvas.getContext("2d", { willReadFrequently: true });
    if (!originalCtx) {
      throw new Error("Failed to get 2D context for original image.");
    }
    originalCtx.drawImage(originalBitmap, 0, 0, width, height);

    const vectorCanvas = new OffscreenCanvas(width, height);
    const vectorCtx = vectorCanvas.getContext("2d", { willReadFrequently: true });
    if (!vectorCtx) {
      throw new Error("Failed to get 2D context for SVG image.");
    }
    vectorCtx.drawImage(svgBitmap, 0, 0, width, height);

    const originalPixels = originalCtx.getImageData(0, 0, width, height).data;
    const vectorPixels = vectorCtx.getImageData(0, 0, width, height).data;
    const score = calculatePixelDiffScore(originalPixels, vectorPixels);

    originalBitmap.close();
    svgBitmap.close();

    const response: SimilarityWorkerResponse = { id, score };
    workerContext.postMessage(response);
  } catch (error) {
    const response: SimilarityWorkerResponse = {
      id,
      error: error instanceof Error ? error.message : "Unknown worker error",
    };
    workerContext.postMessage(response);
  }
};

export {};
