"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Dropzone } from "@/components/Dropzone";
import { SvgPreview } from "@/components/SvgPreview";
import { DownloadButton } from "@/components/DownloadButton";
import {
  traceImage,
  type TracePreset,
  type TraceSettings,
} from "@/lib/tracer";
import { validatePngFile } from "@/lib/fileValidation";
import { useTheme } from "next-themes";
import { Github, Globe, Moon, Sun, Youtube } from "lucide-react";

const QUALITY_PRESETS: Array<{ value: TracePreset; label: string; description: string }> = [
  {
    value: "ultra",
    label: "Ultra (Current Best)",
    description: "Highest fidelity. Closest to the input PNG.",
  },
  {
    value: "balanced",
    label: "Balanced",
    description: "Good quality with smaller SVG output.",
  },
  {
    value: "fast",
    label: "Fast",
    description: "Fast conversion with lower detail.",
  },
  {
    value: "pixel-art",
    label: "Pixel Art",
    description: "Preserves hard edges for pixel-style graphics.",
  },
];

type AdvancedUiSettings = {
  numberofcolors: number;
  ltres: number;
  qtres: number;
  pathomit: number;
  roundcoords: number;
  colorquantcycles: number;
  blurradius: number;
  blurdelta: number;
};

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

type PendingSimilarityRequest = {
  resolve: (score: number) => void;
  reject: (reason?: unknown) => void;
};

const DEFAULT_ADVANCED_SETTINGS: AdvancedUiSettings = {
  numberofcolors: 256,
  ltres: 0.06,
  qtres: 0.06,
  pathomit: 0,
  roundcoords: 3,
  colorquantcycles: 8,
  blurradius: 0,
  blurdelta: 20,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function calculateSimilarityScoreOnMainThread(file: File, svgString: string): Promise<number> {
  const originalUrl = await readFileAsDataUrl(file);
  const originalImage = await loadImage(originalUrl);
  const svgBlob = new Blob([svgString], { type: "image/svg+xml" });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const svgImage = await loadImage(svgUrl);
    const maxSide = 512;
    const scale = Math.min(1, maxSide / Math.max(originalImage.naturalWidth, originalImage.naturalHeight));
    const width = Math.max(1, Math.round(originalImage.naturalWidth * scale));
    const height = Math.max(1, Math.round(originalImage.naturalHeight * scale));

    const originalCanvas = document.createElement("canvas");
    originalCanvas.width = width;
    originalCanvas.height = height;
    const originalCtx = originalCanvas.getContext("2d", { willReadFrequently: true });
    if (!originalCtx) return 0;
    originalCtx.drawImage(originalImage, 0, 0, width, height);

    const vectorCanvas = document.createElement("canvas");
    vectorCanvas.width = width;
    vectorCanvas.height = height;
    const vectorCtx = vectorCanvas.getContext("2d", { willReadFrequently: true });
    if (!vectorCtx) return 0;
    vectorCtx.drawImage(svgImage, 0, 0, width, height);

    const originalPixels = originalCtx.getImageData(0, 0, width, height).data;
    const vectorPixels = vectorCtx.getImageData(0, 0, width, height).data;

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
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unknown error";
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [svgString, setSvgString] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [preset, setPreset] = useState<TracePreset>("ultra");
  const [optimizeForSize, setOptimizeForSize] = useState(false);
  const [advancedEnabled, setAdvancedEnabled] = useState(false);
  const [advancedSettings, setAdvancedSettings] = useState<AdvancedUiSettings>(
    DEFAULT_ADVANCED_SETTINGS
  );
  const [similarityScore, setSimilarityScore] = useState<number | null>(null);
  const [isScoring, setIsScoring] = useState(false);
  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [batchSummary, setBatchSummary] = useState<string | null>(null);
  const [uiError, setUiError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const similarityWorkerRef = useRef<Worker | null>(null);
  const pendingSimilarityRequestsRef = useRef<Map<number, PendingSimilarityRequest>>(new Map());
  const similarityRequestIdRef = useRef(0);
  const { theme, setTheme } = useTheme();

  const selectedPresetInfo = useMemo(
    () => QUALITY_PRESETS.find((item) => item.value === preset),
    [preset]
  );

  const traceSettings = useMemo<TraceSettings>(
    () => ({
      preset,
      optimizeForSize,
      advanced: advancedEnabled ? advancedSettings : undefined,
    }),
    [preset, optimizeForSize, advancedEnabled, advancedSettings]
  );

  const svgSize = useMemo(() => {
    if (!svgString) return null;
    const bytes = new Blob([svgString], { type: "image/svg+xml" }).size;
    return `${(bytes / 1024).toFixed(1)} KB`;
  }, [svgString]);

  const similarityLabel = useMemo(() => {
    if (similarityScore === null) return null;
    if (similarityScore >= 98) return "Near-identical";
    if (similarityScore >= 94) return "Very close";
    if (similarityScore >= 90) return "Good";
    return "Needs tuning";
  }, [similarityScore]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof Worker === "undefined") return;
    const pendingRequests = pendingSimilarityRequestsRef.current;

    try {
      const worker = new Worker(new URL("../workers/similarity.worker.ts", import.meta.url), {
        type: "module",
      });

      worker.onmessage = (event: MessageEvent<SimilarityWorkerResponse>) => {
        const response = event.data;
        const pending = pendingRequests.get(response.id);
        if (!pending) return;

        pendingRequests.delete(response.id);
        if ("error" in response) {
          pending.reject(new Error(response.error));
          return;
        }
        pending.resolve(response.score);
      };

      worker.onerror = () => {
        for (const pending of pendingRequests.values()) {
          pending.reject(new Error("Similarity worker failed."));
        }
        pendingRequests.clear();
      };

      similarityWorkerRef.current = worker;
    } catch (err) {
      console.warn("Similarity worker initialization failed, falling back to main thread.", err);
      similarityWorkerRef.current = null;
    }

    return () => {
      const worker = similarityWorkerRef.current;
      if (worker) {
        worker.terminate();
        similarityWorkerRef.current = null;
      }
      for (const pending of pendingRequests.values()) {
        pending.reject(new Error("Similarity worker terminated."));
      }
      pendingRequests.clear();
    };
  }, []);

  const persistThemeCookie = (nextTheme: "light" | "dark") => {
    document.cookie = `theme=${nextTheme}; path=/; max-age=31536000; samesite=lax`;
  };

  useEffect(() => {
    if (theme === "light" || theme === "dark") {
      persistThemeCookie(theme);
    }
  }, [theme]);

  const handleThemeToggle = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    persistThemeCookie(nextTheme);
  };

  const handleFileSelect = async (selectedFile: File) => {
    const validation = await validatePngFile(selectedFile);
    if (!validation.valid) {
      setUiError(`Invalid PNG file: ${validation.reason ?? "Unknown validation error"}.`);
      return;
    }

    setFile(selectedFile);
    setSvgString(null);
    setSimilarityScore(null);
    setUiError(null);
  };

  useEffect(() => {
    if (!file) return;

    let isActive = true;
    const runTrace = async () => {
      setIsProcessing(true);
      setSvgString(null);
      setSimilarityScore(null);

      try {
        const result = await traceImage(file, traceSettings);
        if (!isActive) return;
        setSvgString(result);
      } catch (err) {
        if (!isActive) return;
        console.error(err);
        setUiError("Failed to convert image. Try another PNG or adjust settings.");
      } finally {
        if (!isActive) return;
        setIsProcessing(false);
      }
    };

    void runTrace();
    return () => {
      isActive = false;
    };
  }, [file, traceSettings]);

  useEffect(() => {
    let isActive = true;
    const runScore = async () => {
      if (!file || !svgString) {
        setSimilarityScore(null);
        setIsScoring(false);
        return;
      }

      setIsScoring(true);
      try {
        let score: number;
        const worker = similarityWorkerRef.current;

        if (worker) {
          try {
            const requestId = ++similarityRequestIdRef.current;
            score = await new Promise<number>((resolve, reject) => {
              pendingSimilarityRequestsRef.current.set(requestId, { resolve, reject });

              const payload: SimilarityWorkerRequest = {
                id: requestId,
                file,
                svgString,
                maxSide: 512,
              };
              worker.postMessage(payload);
            });
          } catch (workerError) {
            const message = getErrorMessage(workerError).toLowerCase();
            // Some browsers fail SVG bitmap decoding inside Worker; retry on main thread.
            if (message.includes("decode") || message.includes("decod")) {
              score = await calculateSimilarityScoreOnMainThread(file, svgString);
            } else {
              throw workerError;
            }
          }
        } else {
          score = await calculateSimilarityScoreOnMainThread(file, svgString);
        }

        if (!isActive) return;
        setSimilarityScore(score);
      } catch {
        if (!isActive) return;
        setSimilarityScore(null);
      } finally {
        if (!isActive) return;
        setIsScoring(false);
      }
    };

    void runScore();
    return () => {
      isActive = false;
    };
  }, [file, svgString]);

  const clearFile = () => {
    if (isProcessing) return;
    setFile(null);
    setSvgString(null);
    setSimilarityScore(null);
    setUiError(null);
  };

  const updateAdvancedSetting = (key: keyof AdvancedUiSettings, value: number) => {
    setAdvancedSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleBatchFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files ?? []);
    void (async () => {
      const validFiles: File[] = [];
      const rejectedFiles: string[] = [];

      for (const currentFile of selectedFiles) {
        const validation = await validatePngFile(currentFile);
        if (validation.valid) {
          validFiles.push(currentFile);
        } else {
          rejectedFiles.push(currentFile.name);
        }
      }

      setBatchFiles(validFiles);
      if (validFiles.length === 0) {
        setBatchSummary("No valid PNG files selected.");
      } else if (rejectedFiles.length > 0) {
        setBatchSummary(
          `${validFiles.length} PNG file(s) selected. Rejected: ${rejectedFiles.join(", ")}`
        );
      } else {
        setBatchSummary(`${validFiles.length} PNG file(s) selected.`);
      }
      setUiError(null);
    })();
  };

  const handleBatchConvert = async () => {
    if (!batchFiles.length || isBatchProcessing || isProcessing) return;

    setIsBatchProcessing(true);
    setBatchProgress({ current: 0, total: batchFiles.length });
    setBatchSummary(null);

    try {
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      const failedFiles: string[] = [];
      let successCount = 0;

      for (let index = 0; index < batchFiles.length; index += 1) {
        const currentFile = batchFiles[index];
        try {
          const svg = await traceImage(currentFile, traceSettings);
          const outputName =
            currentFile.name.replace(/\.[^/.]+$/, "") + `-${preset}.svg`;
          zip.file(outputName, svg);
          successCount += 1;
        } catch (err) {
          console.error(err);
          failedFiles.push(currentFile.name);
        } finally {
          setBatchProgress({ current: index + 1, total: batchFiles.length });
        }
      }

      if (successCount === 0) {
        setBatchSummary("Batch conversion failed for all files.");
        return;
      }

      const zipBlob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 9 },
      });

      triggerDownload(zipBlob, `vectorized-${preset}.zip`);

      if (failedFiles.length) {
        setBatchSummary(
          `${successCount}/${batchFiles.length} converted. Failed: ${failedFiles.join(", ")}`
        );
      } else {
        setBatchSummary(`All ${successCount} files converted and downloaded as ZIP.`);
      }
    } catch (err) {
      console.error(err);
      setBatchSummary("Batch conversion failed.");
    } finally {
      setIsBatchProcessing(false);
    }
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 md:py-24">
      <header className="mb-12 flex items-center justify-between">
        <div>
          <h1 className="text-4xl tracking-tight font-extrabold text-zinc-900 dark:text-zinc-50">
            Vectorize
          </h1>
          <p className="mt-2 text-zinc-500 dark:text-zinc-400">
            Convert PNGs to SVG purely in your browser.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <a
              href="https://khepridev.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-3 py-1.5 text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <Globe className="h-4 w-4" />
              khepridev.xyz
            </a>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="https://github.com/Khepridev"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full p-2.5 bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
            aria-label="Khepridev GitHub"
          >
            <Github className="h-5 w-5" />
          </a>
          <a
            href="https://www.youtube.com/@Khepridev"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full p-2.5 bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
            aria-label="Khepridev YouTube"
          >
            <Youtube className="h-5 w-5" />
          </a>
          <Link
            href="/docs"
            className="rounded-xl px-3 py-2 text-sm font-medium bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
          >
            Docs
          </Link>
          <button
            onClick={handleThemeToggle}
            className="rounded-full p-2.5 bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
            aria-label="Toggle theme"
          >
            {mounted ? (
              theme === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )
            ) : (
              <div className="h-5 w-5" />
            )}
          </button>
        </div>
      </header>

      {uiError && (
        <section className="mb-8 rounded-2xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300">
          {uiError}
        </section>
      )}

      <section className="mb-8 rounded-2xl border border-zinc-200 bg-white/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Quality profile</span>
            <select
              value={preset}
              onChange={(e) => setPreset(e.target.value as TracePreset)}
              disabled={isProcessing || isBatchProcessing}
              className="rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition-colors focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            >
              {QUALITY_PRESETS.map((profile) => (
                <option key={profile.value} value={profile.value}>
                  {profile.label}
                </option>
              ))}
            </select>
          </label>

          <label className="inline-flex h-11 items-center gap-3 rounded-xl border border-zinc-300 px-3 text-sm text-zinc-700 dark:border-zinc-700 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={optimizeForSize}
              onChange={(e) => setOptimizeForSize(e.target.checked)}
              disabled={isProcessing || isBatchProcessing}
              className="h-4 w-4 accent-indigo-600"
            />
            Smaller SVG file
          </label>
        </div>
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
          {selectedPresetInfo?.description} Default is{" "}
          <span className="font-semibold text-zinc-700 dark:text-zinc-200">Ultra</span> to keep your current best quality.
        </p>

        <details className="mt-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
          <summary className="cursor-pointer text-sm font-semibold text-zinc-700 dark:text-zinc-200">
            Advanced controls
          </summary>
          <div className="mt-4 space-y-4">
            <label className="inline-flex items-center gap-3 text-sm text-zinc-700 dark:text-zinc-300">
              <input
                type="checkbox"
                checked={advancedEnabled}
                onChange={(e) => setAdvancedEnabled(e.target.checked)}
                disabled={isProcessing || isBatchProcessing}
                className="h-4 w-4 accent-indigo-600"
              />
              Enable manual trace overrides
            </label>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-300">
                Colors: {advancedSettings.numberofcolors}
                <input
                  type="range"
                  min={8}
                  max={256}
                  step={1}
                  value={advancedSettings.numberofcolors}
                  onChange={(e) => updateAdvancedSetting("numberofcolors", Number(e.target.value))}
                  disabled={!advancedEnabled || isProcessing || isBatchProcessing}
                  className="accent-indigo-600"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-300">
                Line threshold (ltres): {advancedSettings.ltres.toFixed(2)}
                <input
                  type="range"
                  min={0.01}
                  max={1}
                  step={0.01}
                  value={advancedSettings.ltres}
                  onChange={(e) => updateAdvancedSetting("ltres", Number(e.target.value))}
                  disabled={!advancedEnabled || isProcessing || isBatchProcessing}
                  className="accent-indigo-600"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-300">
                Curve threshold (qtres): {advancedSettings.qtres.toFixed(2)}
                <input
                  type="range"
                  min={0.01}
                  max={1}
                  step={0.01}
                  value={advancedSettings.qtres}
                  onChange={(e) => updateAdvancedSetting("qtres", Number(e.target.value))}
                  disabled={!advancedEnabled || isProcessing || isBatchProcessing}
                  className="accent-indigo-600"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-300">
                Path omit: {advancedSettings.pathomit}
                <input
                  type="range"
                  min={0}
                  max={24}
                  step={1}
                  value={advancedSettings.pathomit}
                  onChange={(e) => updateAdvancedSetting("pathomit", Number(e.target.value))}
                  disabled={!advancedEnabled || isProcessing || isBatchProcessing}
                  className="accent-indigo-600"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-300">
                Round coordinates: {advancedSettings.roundcoords}
                <input
                  type="range"
                  min={0}
                  max={5}
                  step={1}
                  value={advancedSettings.roundcoords}
                  onChange={(e) => updateAdvancedSetting("roundcoords", Number(e.target.value))}
                  disabled={!advancedEnabled || isProcessing || isBatchProcessing}
                  className="accent-indigo-600"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-300">
                Quant cycles: {advancedSettings.colorquantcycles}
                <input
                  type="range"
                  min={1}
                  max={12}
                  step={1}
                  value={advancedSettings.colorquantcycles}
                  onChange={(e) => updateAdvancedSetting("colorquantcycles", Number(e.target.value))}
                  disabled={!advancedEnabled || isProcessing || isBatchProcessing}
                  className="accent-indigo-600"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-300">
                Blur radius: {advancedSettings.blurradius}
                <input
                  type="range"
                  min={0}
                  max={5}
                  step={1}
                  value={advancedSettings.blurradius}
                  onChange={(e) => updateAdvancedSetting("blurradius", Number(e.target.value))}
                  disabled={!advancedEnabled || isProcessing || isBatchProcessing}
                  className="accent-indigo-600"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-300">
                Blur delta: {advancedSettings.blurdelta}
                <input
                  type="range"
                  min={1}
                  max={256}
                  step={1}
                  value={advancedSettings.blurdelta}
                  onChange={(e) => updateAdvancedSetting("blurdelta", Number(e.target.value))}
                  disabled={!advancedEnabled || isProcessing || isBatchProcessing}
                  className="accent-indigo-600"
                />
              </label>
            </div>
          </div>
        </details>
      </section>

      <section className="mb-8 rounded-2xl border border-zinc-200 bg-white/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">Batch convert</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Select multiple PNG files and download all SVG outputs in one ZIP.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="file"
              accept="image/png"
              multiple
              onChange={handleBatchFileSelection}
              disabled={isBatchProcessing || isProcessing}
              className="block w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
            />
            <button
              onClick={handleBatchConvert}
              disabled={!batchFiles.length || isBatchProcessing || isProcessing}
              className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isBatchProcessing
                ? `Converting ${batchProgress.current}/${batchProgress.total}...`
                : "Convert + Download ZIP"}
            </button>
          </div>
        </div>
        {batchSummary && (
          <p className="mt-3 text-xs text-zinc-600 dark:text-zinc-300">{batchSummary}</p>
        )}
      </section>

      {!file && (
        <section className="animate-in fade-in duration-500">
          <Dropzone onFileSelect={handleFileSelect} isProcessing={isProcessing || isBatchProcessing} />
        </section>
      )}

      {file && (
        <section className="space-y-8 animate-in fade-in duration-500">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 truncate flex-1 mr-4">
              {file.name}
            </h2>
            <button
              onClick={clearFile}
              className="text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              Start Over
            </button>
          </div>

          <SvgPreview originalFile={file} svgString={svgString || ""} />

          {svgString ? (
            <div className="flex justify-end pt-4">
              <div className="flex w-full flex-col items-end gap-2">
                <div className="flex flex-wrap items-center justify-end gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                  {svgSize && (
                    <p>
                      Output size:{" "}
                      <span className="font-semibold text-zinc-700 dark:text-zinc-200">{svgSize}</span>
                    </p>
                  )}
                  {isScoring ? (
                    <p>Similarity: calculating...</p>
                  ) : similarityScore !== null ? (
                    <p>
                      Similarity:{" "}
                      <span className="font-semibold text-zinc-700 dark:text-zinc-200">
                        {similarityScore.toFixed(2)}%
                      </span>{" "}
                      <span>({similarityLabel})</span>
                    </p>
                  ) : null}
                </div>
                <DownloadButton
                  svgString={svgString}
                  filename={file.name.replace(/\.[^/.]+$/, "") + `-${preset}.svg`}
                />
              </div>
            </div>
          ) : (
            <div className="flex justify-center p-12">
              <div className="flex flex-col items-center space-y-4">
                <div className="w-10 h-10 rounded-full border-4 border-zinc-200 dark:border-zinc-800 border-t-indigo-500 dark:border-t-indigo-500 animate-spin"></div>
                <p className="text-zinc-500 dark:text-zinc-400">
                  Tracing with <span className="font-medium">{selectedPresetInfo?.label}</span>...
                </p>
              </div>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
