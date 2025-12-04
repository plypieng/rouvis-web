'use client';

import { useTranslations } from 'next-intl';
import { useRef, useEffect } from 'react';

interface TimelineViewProps {
    schedule: any; // We'll refine this type
    currentWeek: number;
}

export default function TimelineView({ schedule, currentWeek }: TimelineViewProps) {
    const t = useTranslations('projects.timeline');
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to current week
    useEffect(() => {
        if (scrollRef.current) {
            const currentElement = scrollRef.current.querySelector(`[data-week="${currentWeek}"]`);
            if (currentElement) {
                currentElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        }
    }, [currentWeek]);

    // Mock data generation if schedule is simple
    const weeks = schedule?.weeks || Array.from({ length: 12 }, (_, i) => ({
        weekNumber: i + 1,
        status: i + 1 < currentWeek ? 'past' : i + 1 === currentWeek ? 'current' : 'future',
        title: `Week ${i + 1}`
    }));

    return (
        <div className="mb-8">
            <div className="flex justify-between items-center mb-3 px-1">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <span className="material-symbols-outlined text-green-600">timeline</span>
                    {t('growth_journey')}
                </h2>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    Week {currentWeek}
                </span>
            </div>

            <div
                ref={scrollRef}
                className="flex gap-3 overflow-x-auto pb-4 pt-1 px-1 snap-x hide-scrollbar"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {weeks.map((week: any) => {
                    const isCurrent = week.weekNumber === currentWeek;
                    const isPast = week.weekNumber < currentWeek;

                    return (
                        <div
                            key={week.weekNumber}
                            data-week={week.weekNumber}
                            className={`
                                flex-shrink-0 w-32 p-3 rounded-xl border transition-all duration-300 snap-center cursor-pointer
                                ${isCurrent
                                    ? 'bg-green-600 text-white border-green-600 shadow-lg scale-105 transform'
                                    : isPast
                                        ? 'bg-gray-50 text-gray-400 border-gray-200'
                                        : 'bg-white text-gray-600 border-gray-200 hover:border-green-300'
                                }
                            `}
                        >
                            <div className="text-xs font-medium mb-1 opacity-80">
                                {isPast ? 'COMPLETED' : isCurrent ? 'CURRENT' : 'UPCOMING'}
                            </div>
                            <div className={`text-xl font-bold mb-1 ${isCurrent ? 'text-white' : 'text-gray-800'}`}>
                                Week {week.weekNumber}
                            </div>
                            <div className="h-1 w-full bg-black/10 rounded-full overflow-hidden">
                                <div className={`h-full ${isPast ? 'bg-green-500' : isCurrent ? 'bg-white/80' : 'bg-transparent'}`}></div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
