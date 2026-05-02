"use client";

import { Download } from "lucide-react";

interface DownloadButtonProps {
    svgString: string;
    filename?: string;
}

export function DownloadButton({ svgString, filename = "vectorized.svg" }: DownloadButtonProps) {
    const handleDownload = () => {
        const blob = new Blob([svgString], { type: "image/svg+xml" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <button
            onClick={handleDownload}
            className="inline-flex w-full sm:w-auto items-center justify-center rounded-xl bg-indigo-600 px-8 py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-950"
        >
            <Download className="mr-2 h-5 w-5" />
            Download SVG
        </button>
    );
}
