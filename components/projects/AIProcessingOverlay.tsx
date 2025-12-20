'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

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

export default function AIProcessingOverlay({ mode = 'scan' }: { mode?: 'scan' | 'manual' }) {
    const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
    const messages = mode === 'scan' ? SCAN_MESSAGES : MANUAL_MESSAGES;

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentMessageIndex((prev) => (prev + 1) % messages.length);
        }, 2000);

        return () => clearInterval(interval);
    }, [messages.length]);

    return (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm rounded-2xl">
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
                    {/* Using a sparkly icon to represent AI Magic */}
                    <span className="material-symbols-outlined text-4xl text-green-600">
                        auto_awesome
                    </span>
                </div>
            </div>

            <div className="h-8 flex items-center justify-center overflow-hidden relative w-full">
                <AnimatePresence mode="wait">
                    <motion.p
                        key={currentMessageIndex}
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -20, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="text-lg font-medium text-gray-700 text-center absolute"
                    >
                        {messages[currentMessageIndex]}
                    </motion.p>
                </AnimatePresence>
            </div>

            <p className="mt-2 text-sm text-gray-400">AIが考えています...</p>
        </div>
    );
}
