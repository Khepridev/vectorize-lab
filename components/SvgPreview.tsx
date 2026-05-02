"use client";

import { useEffect, useMemo, useState } from "react";
import NextImage from "next/image";
import { sanitizeSvg } from "@/lib/sanitizeSvg";

interface SvgPreviewProps {
    originalFile: File;
    svgString: string;
}

export function SvgPreview({ originalFile, svgString }: SvgPreviewProps) {
    const [originalDataUrl, setOriginalDataUrl] = useState<string>("");
    const [dims, setDims] = useState<{ width: number; height: number } | null>(null);
    const sanitizedSvgString = useMemo(() => sanitizeSvg(svgString), [svgString]);

    useEffect(() => {
        let isActive = true;
        const reader = new FileReader();

        reader.onload = () => {
            if (!isActive) return;
            const dataUrl = reader.result;
            if (typeof dataUrl !== "string") {
                setOriginalDataUrl("");
                setDims(null);
                return;
            }

            setOriginalDataUrl(dataUrl);

            const img = new window.Image();
            img.onload = () => {
                if (!isActive) return;
                setDims({ width: img.naturalWidth, height: img.naturalHeight });
            };
            img.onerror = () => {
                if (!isActive) return;
                setDims(null);
            };
            img.src = dataUrl;
        };

        reader.onerror = () => {
            if (!isActive) return;
            setOriginalDataUrl("");
            setDims(null);
        };

        reader.readAsDataURL(originalFile);

        return () => {
            isActive = false;
        };
    }, [originalFile]);

    const checkeredBg = {
        backgroundImage:
            "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 2 2\"><rect width=\"1\" height=\"1\" fill=\"rgba(128,128,128,0.15)\"/><rect x=\"1\" y=\"1\" width=\"1\" height=\"1\" fill=\"rgba(128,128,128,0.15)\"/></svg>')",
        backgroundSize: "16px 16px",
    };

    return (
        <div className="mt-8 space-y-8">
            {dims && (
                <p className="text-xs text-zinc-400 dark:text-zinc-500">
                    Orijinal boyut:&nbsp;
                    <span className="font-mono font-semibold text-zinc-600 dark:text-zinc-300">
                        {dims.width} x {dims.height} px
                    </span>
                </p>
            )}

            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                <div className="flex flex-col space-y-3">
                    <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                        Original PNG
                    </h3>
                    <div
                        className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-auto"
                        style={{ maxHeight: "60vh", ...checkeredBg }}
                    >
                        {originalDataUrl && dims && (
                            <NextImage
                                src={originalDataUrl}
                                alt="Original"
                                width={dims.width}
                                height={dims.height}
                                unoptimized
                                style={{ width: dims.width, height: dims.height, display: "block" }}
                            />
                        )}
                    </div>
                </div>

                <div className="flex flex-col space-y-3">
                    <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                        Vectorized SVG
                    </h3>
                    <div
                        className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-auto"
                        style={{ maxHeight: "60vh", ...checkeredBg }}
                    >
                        <div
                            className="[&>svg]:block"
                            style={dims ? { width: dims.width, height: dims.height } : {}}
                            dangerouslySetInnerHTML={{ __html: sanitizedSvgString }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
