"use client";

import { useState, useCallback } from "react";
import { UploadCloud } from "lucide-react";

interface DropzoneProps {
    onFileSelect: (file: File) => void | Promise<void>;
    isProcessing: boolean;
}

export function Dropzone({ onFileSelect, isProcessing }: DropzoneProps) {
    const [isDragging, setIsDragging] = useState(false);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setIsDragging(true);
        } else if (e.type === "dragleave" || e.type === "drop") {
            setIsDragging(false);
        }
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(false);

            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                const file = e.dataTransfer.files[0];
                void onFileSelect(file);
            }
        },
        [onFileSelect]
    );

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            void onFileSelect(file);
        }
    };

    return (
        <div
            className={`relative w-full rounded-2xl border-2 border-dashed p-12 text-center transition-all duration-200 ease-in-out ${isDragging
                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10"
                    : "border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
        >
            <input
                type="file"
                accept="image/png"
                onChange={handleChange}
                className="absolute inset-0 z-50 h-full w-full cursor-pointer opacity-0"
                disabled={isProcessing}
            />
            <div className="flex flex-col items-center justify-center space-y-4">
                <UploadCloud
                    className={`h-12 w-12 ${isDragging ? "text-indigo-500" : "text-zinc-400 dark:text-zinc-500"
                        }`}
                />
                <div className="text-lg font-medium text-zinc-700 dark:text-zinc-300">
                    {isProcessing ? "Processing..." : "Drop your PNG here or click to browse"}
                </div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Supports color and monochrome PNGs
                </p>
            </div>
        </div>
    );
}
