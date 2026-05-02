"use client";

import type { ImageTracerApi, ImageTracerOptions } from "imagetracerjs";

export type TracePreset = "ultra" | "balanced" | "fast" | "pixel-art";

export interface TraceAdvancedSettings {
  scaleFactor?: number;
  numberofcolors?: number;
  ltres?: number;
  qtres?: number;
  pathomit?: number;
  roundcoords?: number;
  colorquantcycles?: number;
  blurradius?: number;
  blurdelta?: number;
}

export interface TraceSettings {
  preset?: TracePreset;
  optimizeForSize?: boolean;
  advanced?: TraceAdvancedSettings;
}

const DEFAULT_TRACE_SETTINGS = {
  preset: "ultra",
  optimizeForSize: false,
} as const;

function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function getScaleFactor(
  width: number,
  height: number,
  preset: TracePreset,
  manualScaleFactor?: number
): number {
  if (typeof manualScaleFactor === "number" && Number.isFinite(manualScaleFactor)) {
    return clamp(Math.round(manualScaleFactor), 1, 12);
  }

  const maxEdge = Math.max(width, height);

  if (preset === "ultra") {
    if (maxEdge <= 64) return 8;
    if (maxEdge <= 256) return 4;
    if (maxEdge <= 1024) return 2;
    return 1;
  }

  if (preset === "balanced") {
    if (maxEdge <= 128) return 4;
    if (maxEdge <= 1024) return 2;
    return 1;
  }

  if (preset === "pixel-art") {
    if (maxEdge <= 128) return 8;
    if (maxEdge <= 512) return 4;
    return 2;
  }

  if (maxEdge <= 256) return 2;
  return 1;
}

function getScaledDataUrl(
  dataUrl: string,
  scaleFactor: number,
  preservePixelEdges: boolean
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.naturalWidth * scaleFactor);
      canvas.height = Math.round(img.naturalHeight * scaleFactor);
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject("Canvas ctx failed");

      // Tiny icons are usually sharper with nearest-neighbor upscaling before tracing.
      ctx.imageSmoothingEnabled = !preservePixelEdges;
      if (!preservePixelEdges) {
        ctx.imageSmoothingQuality = "high";
      }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function patchSvgSize(svgString: string, width: number, height: number): string {
  const doc = new DOMParser().parseFromString(svgString, "image/svg+xml");
  const svg = doc.documentElement;

  if (!svg || svg.nodeName.toLowerCase() !== "svg") return svgString;

  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));

  if (!svg.getAttribute("viewBox")) {
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  }

  return new XMLSerializer().serializeToString(svg);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function applyAdvancedOverrides(
  options: ImageTracerOptions,
  advanced?: TraceAdvancedSettings
): ImageTracerOptions {
  if (!advanced) return options;

  const next: ImageTracerOptions = { ...options };

  if (typeof advanced.numberofcolors === "number" && Number.isFinite(advanced.numberofcolors)) {
    next.numberofcolors = clamp(Math.round(advanced.numberofcolors), 2, 256);
  }
  if (typeof advanced.ltres === "number" && Number.isFinite(advanced.ltres)) {
    next.ltres = clamp(advanced.ltres, 0.01, 10);
  }
  if (typeof advanced.qtres === "number" && Number.isFinite(advanced.qtres)) {
    next.qtres = clamp(advanced.qtres, 0.01, 10);
  }
  if (typeof advanced.pathomit === "number" && Number.isFinite(advanced.pathomit)) {
    next.pathomit = clamp(Math.round(advanced.pathomit), 0, 64);
  }
  if (typeof advanced.roundcoords === "number" && Number.isFinite(advanced.roundcoords)) {
    next.roundcoords = clamp(Math.round(advanced.roundcoords), 0, 5);
  }
  if (typeof advanced.colorquantcycles === "number" && Number.isFinite(advanced.colorquantcycles)) {
    next.colorquantcycles = clamp(Math.round(advanced.colorquantcycles), 1, 12);
  }
  if (typeof advanced.blurradius === "number" && Number.isFinite(advanced.blurradius)) {
    next.blurradius = clamp(Math.round(advanced.blurradius), 0, 5);
  }
  if (typeof advanced.blurdelta === "number" && Number.isFinite(advanced.blurdelta)) {
    next.blurdelta = clamp(Math.round(advanced.blurdelta), 1, 1024);
  }

  return next;
}

function getTraceOptions(
  width: number,
  height: number,
  scaleFactor: number,
  preset: TracePreset,
  optimizeForSize: boolean
): ImageTracerOptions {
  const maxEdge = Math.max(width, height);
  const effectiveMaxEdge = maxEdge * scaleFactor;
  const pixelCount = width * height;
  let options: ImageTracerOptions;

  if (preset === "ultra") {
    const numberofcolors = pixelCount <= 65_536 ? 256 : pixelCount <= 1_048_576 ? 192 : 128;
    const errorThreshold =
      effectiveMaxEdge <= 512 ? 0.03 : effectiveMaxEdge <= 2048 ? 0.06 : 0.1;

    options = {
      ltres: errorThreshold,
      qtres: errorThreshold,
      pathomit: 0,
      rightangleenhance: maxEdge <= 256,
      linefilter: false,
      colorsampling: 2,
      numberofcolors,
      mincolorratio: 0,
      colorquantcycles: 8,
      strokewidth: 0,
      layering: 0,
      blurradius: 0,
      blurdelta: 20,
      scale: 1,
      roundcoords: 3,
      viewbox: true,
    };
  } else if (preset === "balanced") {
    const numberofcolors = pixelCount <= 65_536 ? 128 : pixelCount <= 1_048_576 ? 96 : 64;
    const errorThreshold =
      effectiveMaxEdge <= 512 ? 0.08 : effectiveMaxEdge <= 2048 ? 0.14 : 0.22;

    options = {
      ltres: errorThreshold,
      qtres: errorThreshold,
      pathomit: 1,
      rightangleenhance: true,
      linefilter: false,
      colorsampling: 2,
      numberofcolors,
      mincolorratio: 0,
      colorquantcycles: 5,
      strokewidth: 1,
      layering: 0,
      blurradius: 0,
      blurdelta: 20,
      scale: 1,
      roundcoords: 2,
      viewbox: true,
    };
  } else if (preset === "pixel-art") {
    const numberofcolors = pixelCount <= 16_384 ? 64 : 48;

    options = {
      ltres: 0.01,
      qtres: 0.01,
      pathomit: 0,
      rightangleenhance: true,
      linefilter: false,
      colorsampling: 0,
      numberofcolors,
      mincolorratio: 0,
      colorquantcycles: 6,
      strokewidth: 0,
      layering: 0,
      blurradius: 0,
      blurdelta: 20,
      scale: 1,
      roundcoords: 0,
      viewbox: true,
    };
  } else {
    const numberofcolors = pixelCount <= 65_536 ? 64 : 32;
    const errorThreshold =
      effectiveMaxEdge <= 512 ? 0.14 : effectiveMaxEdge <= 2048 ? 0.25 : 0.35;

    options = {
      ltres: errorThreshold,
      qtres: errorThreshold,
      pathomit: 2,
      rightangleenhance: true,
      linefilter: true,
      colorsampling: 2,
      numberofcolors,
      mincolorratio: 0.001,
      colorquantcycles: 3,
      strokewidth: 1,
      layering: 0,
      blurradius: 1,
      blurdelta: 32,
      scale: 1,
      roundcoords: 1,
      viewbox: true,
    };
  }

  if (!optimizeForSize) return options;

  return {
    ...options,
    numberofcolors: clamp(Math.round((options.numberofcolors ?? 64) * 0.7), 8, 256),
    colorquantcycles: clamp(Math.round((options.colorquantcycles ?? 3) * 0.8), 1, 8),
    pathomit: clamp((options.pathomit ?? 0) + 2, 0, 32),
    roundcoords: clamp((options.roundcoords ?? 1) - 1, 0, 3),
  };
}

export async function traceImage(file: File, settings: TraceSettings = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const resolvedSettings = {
      preset: settings.preset ?? DEFAULT_TRACE_SETTINGS.preset,
      optimizeForSize: settings.optimizeForSize ?? DEFAULT_TRACE_SETTINGS.optimizeForSize,
      advanced: settings.advanced,
    };

    reader.onload = async (e) => {
      try {
        const originalDataUrl = e.target?.result as string;
        const { width, height } = await getImageDimensions(originalDataUrl);
        const scaleFactor = getScaleFactor(
          width,
          height,
          resolvedSettings.preset,
          resolvedSettings.advanced?.scaleFactor
        );
        const preservePixelEdges =
          resolvedSettings.preset === "pixel-art" || Math.max(width, height) <= 256;
        const sourceDataUrl =
          scaleFactor === 1
            ? originalDataUrl
            : await getScaledDataUrl(originalDataUrl, scaleFactor, preservePixelEdges);
        const ImageTracer = (await import("imagetracerjs")).default as ImageTracerApi;
        const options = applyAdvancedOverrides(
          getTraceOptions(
            width,
            height,
            scaleFactor,
            resolvedSettings.preset,
            resolvedSettings.optimizeForSize
          ),
          resolvedSettings.advanced
        );

        ImageTracer.imageToSVG(
          sourceDataUrl,
          (svgString: string) => {
            resolve(patchSvgSize(svgString, width, height));
          },
          options
        );
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
