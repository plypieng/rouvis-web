'use client';

import { motion, AnimatePresence } from 'framer-motion';

export interface QuickReplyOption {
    label: string;
    value: string;
    icon?: string;
}

interface QuickRepliesProps {
    options: QuickReplyOption[];
    onSelect: (value: string) => void;
    disabled?: boolean;
}

export function QuickReplies({ options, onSelect, disabled }: QuickRepliesProps) {
    if (!options || options.length === 0) return null;

    return (
        <div className="flex flex-wrap gap-2 p-2">
            <AnimatePresence>
                {options.map((option, idx) => (
                    <motion.button
                        key={option.value}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ delay: idx * 0.05 }}
                        onClick={() => onSelect(option.value)}
                        disabled={disabled}
                        className="
              flex items-center gap-1.5 px-3 py-1.5 
              bg-emerald-50 text-emerald-700 border border-emerald-200 
              rounded-full text-sm font-medium 
              hover:bg-emerald-100 hover:border-emerald-300 
              active:bg-emerald-200 
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors shadow-sm
            "
                    >
                        {option.icon && <span>{option.icon}</span>}
                        <span>{option.label}</span>
                    </motion.button>
                ))}
            </AnimatePresence>
        </div>
    );
}
