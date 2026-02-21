'use client';

import { type PutBlobResult } from '@vercel/blob';
import { upload } from '@vercel/blob/client';
import { useState, useRef } from 'react';
import { Loader2, UploadCloud, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface ImageUploaderProps {
    onUploadSuccess?: (url: string) => void;
    className?: string;
    defaultImage?: string | null;
    label?: string;
}

export function ImageUploader({
    onUploadSuccess,
    className,
    defaultImage,
    label = "Upload Image"
}: ImageUploaderProps) {
    const inputFileRef = useRef<HTMLInputElement>(null);
    const [blob, setBlob] = useState<PutBlobResult | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const previewUrl = blob?.url || defaultImage;

    const handleUpload = async () => {
        if (!inputFileRef.current?.files) {
            throw new Error("No file selected");
        }

        const file = inputFileRef.current.files[0];
        if (!file) return;

        setIsUploading(true);
        setError(null);

        try {
            // Direct client upload to Vercel
            // This routes through our /api/upload handler to grab a secure token first
            const newBlob = await upload(file.name, file, {
                access: 'public',
                handleUploadUrl: '/api/upload',
            });

            setBlob(newBlob);
            if (onUploadSuccess) {
                onUploadSuccess(newBlob.url);
            }
        } catch (err: any) {
            console.error(err);
            setError(err?.message || "Failed to upload image. Please try again.");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className={cn("w-full flex flex-col gap-4", className)}>
            <div
                className={cn(
                    "relative flex items-center justify-center w-full h-48 border-2 border-dashed rounded-xl transition-all overflow-hidden group",
                    previewUrl ? "border-zinc-200" : "border-zinc-300 hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-700",
                    isUploading ? "opacity-70 pointer-events-none" : "cursor-pointer"
                )}
                onClick={() => !isUploading && inputFileRef.current?.click()}
            >
                {previewUrl ? (
                    <>
                        <Image
                            src={previewUrl}
                            alt="Preview"
                            fill
                            className="object-cover transition-opacity group-hover:opacity-50"
                        />
                        <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 text-white font-medium z-10">
                            <UploadCloud className="w-8 h-8 mb-2" />
                            Change Image
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center gap-2 text-zinc-500 dark:text-zinc-400">
                        {isUploading ? (
                            <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
                        ) : (
                            <UploadCloud className="w-8 h-8 opacity-50" />
                        )}
                        <span className="text-sm font-medium">
                            {isUploading ? "Uploading..." : label}
                        </span>
                        {!isUploading && (
                            <span className="text-xs opacity-60">Click to browse files</span>
                        )}
                    </div>
                )}

                <input
                    name="file"
                    ref={inputFileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleUpload}
                    disabled={isUploading}
                />
            </div>

            {error && (
                <p className="text-sm text-red-500 font-medium px-1.5">{error}</p>
            )}

            {blob && !isUploading && !error && (
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-500 font-medium px-1.5 animate-in fade-in slide-in-from-bottom-2">
                    <CheckCircle className="w-4 h-4" />
                    Upload complete
                </div>
            )}
        </div>
    );
}
