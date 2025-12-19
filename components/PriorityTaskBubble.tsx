'use client';

import React from 'react';

interface Task {
    id: string;
    title: string;
    dueAt: string;
}

interface PriorityTaskBubbleProps {
    task?: Task;
}

export default function PriorityTaskBubble({ task }: PriorityTaskBubbleProps) {
    // Common bubble styles
    const bubbleClasses = "hidden lg:block w-[320px] mr-0 relative";
    const contentClasses = "bg-white border text-card-foreground rounded-2xl rounded-bl-none rounded-br-none p-4 shadow-sm relative h-full flex flex-col justify-center transition-all duration-200";

    // Pointer
    const pointer = (
        <>
            <div className="absolute top-[72px] -right-[8px] z-20 w-3 h-3 bg-white border-t-2 border-r-2 border-primary rotate-45 transform"></div>
        </>
    );

    if (!task) {
        return (
            <div className={bubbleClasses}>
                <div className={`${contentClasses} border-2 border-gray-300 items-center text-muted-foreground text-sm`}>
                    <span className="material-symbols-outlined text-3xl mb-2 opacity-20">event_busy</span>
                    <p>今日の予定はありません</p>
                    {/* Gray pointer for empty state */}
                    <div className="absolute top-[72px] -right-[8px] z-20 w-3 h-3 bg-white border-t-2 border-r-2 border-gray-300 rotate-45 transform"></div>
                </div>
            </div>
        )
    }

    return (
        <div className={bubbleClasses}>
            {/* Speech Bubble Body */}
            <div className={`${contentClasses} border-2 border-primary items-stretch justify-start`}>

                {/* Header */}
                <div className="flex items-center gap-2 mb-2">
                    <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                        今日の最優先
                    </span>
                </div>

                {/* Task Info */}
                <h3 className="text-base font-bold text-foreground mb-1 leading-tight line-clamp-2">
                    {task.title}
                </h3>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                    <span className="flex items-center gap-0.5">
                        <span className="material-symbols-outlined text-[14px]">schedule</span>
                        30分
                    </span>
                    <span className="flex items-center gap-0.5">
                        <span className="material-symbols-outlined text-[14px]">event</span>
                        今日中
                    </span>
                </div>

                {/* Reasons */}
                <div className="space-y-1.5 mb-3">
                    <div className="text-xs font-semibold text-muted-foreground">実施理由</div>
                    <div className="grid grid-cols-2 gap-1.5">
                        <div className="bg-blue-50 text-blue-700 text-xs px-1.5 py-0.5 rounded border border-blue-100 truncate">
                            ☁️ 気象: 降雨前
                        </div>
                        <div className="bg-green-50 text-green-700 text-xs px-1.5 py-0.5 rounded border border-green-100 truncate">
                            🌱 生育: 定植期
                        </div>
                    </div>
                </div>

                {/* Standard Procedure (Checklist) */}
                <div>
                    <div className="text-xs font-semibold text-muted-foreground mb-0.5">具体手順</div>
                    <ul className="space-y-0.5">
                        <li className="flex items-start gap-1.5 text-xs text-foreground/80">
                            <input type="checkbox" className="mt-0.5 scale-90" />
                            <span>資材の準備と点検</span>
                        </li>
                        <li className="flex items-start gap-1.5 text-xs text-foreground/80">
                            <input type="checkbox" className="mt-0.5 scale-90" />
                            <span>作業エリアの確保</span>
                        </li>
                    </ul>
                </div>

                {pointer}

            </div>
        </div>
    );
}
