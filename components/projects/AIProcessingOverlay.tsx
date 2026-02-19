'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';

const SCAN_MESSAGES = [
    '画像を解析中...',
    '種袋から情報を読み取っています...',
    '作物の種類を特定中...',
    '最適な作付けスケジュールを計算中...',
    'あなただけのプランを作成しています...'
];

const MANUAL_MESSAGES = [
    '作物情報を検索中...',
    '栽培知識データベースにアクセス中...',
    '最適な作付けスケジュールを計算中...',
    'あなただけのプランを作成しています...'
];

const SCHEDULE_MESSAGES = [
    'プロジェクト情報を準備しています...',
    'AIがスケジュールを推論しています...',
    'タスクを保存して整えています...',
    '仕上げの確認をしています...'
];

export type AIProcessingMode = 'scan' | 'manual' | 'schedule';

type AIProcessingOverlayProps = {
    mode?: AIProcessingMode;
    statusMessage?: string;
    statusDetail?: string;
    progress?: number;
    testId?: string;
};

function clampProgress(value?: number): number | null {
    if (typeof value !== 'number' || !Number.isFinite(value)) return null;
    return Math.max(0, Math.min(100, value));
}

export default function AIProcessingOverlay({
    mode = 'scan',
    statusMessage,
    statusDetail,
    progress,
    testId,
}: AIProcessingOverlayProps) {
    const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
    const messages = useMemo(() => {
        if (mode === 'manual') return MANUAL_MESSAGES;
        if (mode === 'schedule') return SCHEDULE_MESSAGES;
        return SCAN_MESSAGES;
    }, [mode]);

    const shouldRotateMessages = !statusMessage && messages.length > 1;

    useEffect(() => {
        if (!shouldRotateMessages) {
            setCurrentMessageIndex(0);
            return;
        }

        const interval = setInterval(() => {
            setCurrentMessageIndex((prev) => (prev + 1) % messages.length);
        }, 2000);

        return () => clearInterval(interval);
    }, [messages.length, shouldRotateMessages]);

    const displayMessage = statusMessage || messages[currentMessageIndex] || '処理中...';
    const normalizedProgress = clampProgress(progress);
    const showProgress = mode === 'schedule' || normalizedProgress !== null;
    const icon = mode === 'schedule' ? 'event_upcoming' : 'auto_awesome';

    return (
        <div
            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm rounded-2xl"
            data-testid={testId || 'ai-processing-overlay'}
            data-processing-mode={mode}
        >
            <div className="relative mb-8">
                {/* Outer pulsing ring */}
                <motion.div
                    className="absolute inset-0 rounded-full bg-green-200"
                    animate={{
                        scale: [1, 1.5, 1],
                        opacity: [0.5, 0, 0.5],
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                />

                {/* Middle rotating ring */}
                <motion.div
                    className="absolute inset-[-4px] rounded-full border-2 border-green-400 border-t-transparent"
                    animate={{ rotate: 360 }}
                    transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "linear",
                    }}
                />

                {/* Center Icon */}
                <div className="relative z-10 w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg border border-green-100">
                    <span className="material-symbols-outlined text-4xl text-green-600">
                        {icon}
                    </span>
                </div>
            </div>

            <div className="h-8 flex items-center justify-center overflow-hidden relative w-full">
                <AnimatePresence mode="wait">
                    <motion.p
                        key={`${mode}-${displayMessage}`}
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -20, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="text-lg font-medium text-gray-700 text-center absolute"
                    >
                        {displayMessage}
                    </motion.p>
                </AnimatePresence>
            </div>

            <p className="mt-2 text-sm text-gray-400">{statusDetail || 'AIが考えています...'}</p>

            {showProgress && (
                <div className="mt-5 w-full max-w-[320px] px-3">
                    <div className="h-2 overflow-hidden rounded-full bg-green-100/90">
                        {normalizedProgress === null ? (
                            <motion.div
                                className="h-full w-1/2 rounded-full bg-green-500"
                                animate={{ x: ['-100%', '200%'] }}
                                transition={{
                                    duration: 1.6,
                                    repeat: Infinity,
                                    ease: 'easeInOut',
                                }}
                            />
                        ) : (
                            <motion.div
                                className="h-full rounded-full bg-green-500"
                                initial={{ width: 0 }}
                                animate={{ width: `${normalizedProgress}%` }}
                                transition={{ duration: 0.35, ease: 'easeOut' }}
                            />
                        )}
                    </div>
                    <p className="mt-2 text-center text-xs text-gray-500">
                        {normalizedProgress === null
                            ? '進捗を計算中...'
                            : `進捗 ${Math.round(normalizedProgress)}%`}
                    </p>
                </div>
            )}
        </div>
    );
}
