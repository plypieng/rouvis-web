'use client';

import { useChat } from '@ai-sdk/react';
import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { useTranslations } from 'next-intl';
import ReactMarkdown from 'react-markdown';

export interface CustomChatKitRef {
    sendMessage: (message: string) => void;
}

interface CustomChatKitProps {
    className?: string;
    projectId?: string;
    initialThreadId?: string;
    onTaskUpdate?: () => void;
    density?: 'compact' | 'comfortable';
}

export const CustomChatKit = forwardRef<CustomChatKitRef, CustomChatKitProps>(({
    className,
    projectId,
    initialThreadId,
    onTaskUpdate,
    density = 'comfortable',
}, ref) => {
    const t = useTranslations();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Vercel AI SDK hook
    // Casting to any to avoid type inference issues with current setup
    const { messages, input, setInput, handleSubmit, isLoading, error, append } = useChat({
        api: '/api/chat',
        body: {
            projectId,
            threadId: initialThreadId,
        },
        onFinish: () => {
            // Refresh tasks if needed
            if (onTaskUpdate) onTaskUpdate();
        },
    } as any) as any;

    useImperativeHandle(ref, () => ({
        sendMessage: (message: string) => {
            append({ role: 'user', content: message });
        }
    }));

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    return (
        <div className={`flex flex-col h-full bg-white ${className}`}>
            {/* ... (header omitted) ... */}

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* ... (messages omitted) ... */}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-gray-200 bg-white">
                <form onSubmit={handleSubmit} className="relative">
                    <input
                        className="w-full p-4 pr-12 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all shadow-sm"
                        value={input || ''}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={t('chat.placeholder') || "Type your message..."}
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input?.trim()}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    </button>
                </form>
            </div>
        </div>
    );
});

CustomChatKit.displayName = 'CustomChatKit';
