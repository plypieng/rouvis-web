'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';

interface TourStep {
    target: string; // CSS selector for the element to highlight
    title: string;
    description: string;
    position: 'top' | 'bottom' | 'left' | 'right';
}

const TOUR_STEPS: TourStep[] = [
    {
        target: 'h2', // "My Projects" header
        title: 'ここがプロジェクト一覧',
        description: 'あなたの作物サイクルがここに表示されます',
        position: 'bottom',
    },
    {
        target: 'a[href*="/projects/create"]', // Create project button
        title: '新規プロジェクトを作成',
        description: '作物と圃場を選ぶと、AIがスケジュールを自動生成します',
        position: 'bottom',
    },
    {
        target: '#project-chat-kit, [class*="ChatKit"], textarea', // Chat area
        title: 'AIに何でも質問',
        description: '天気や作業のことを聞いたり、写真で病害診断もできます',
        position: 'left',
    },
];

const TOUR_STORAGE_KEY = 'rouvis_tour_completed';

export default function OnboardingTour() {
    const [currentStep, setCurrentStep] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
    const pathname = usePathname();

    // Only show tour on the main projects list page
    const shouldShowTour = pathname?.endsWith('/projects');

    const highlightCurrentStep = useCallback(() => {
        const step = TOUR_STEPS[currentStep];
        if (!step) return;

        const element = document.querySelector(step.target);
        if (element) {
            const rect = element.getBoundingClientRect();
            setTargetRect(rect);
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [currentStep]);

    // Check if tour should show
    useEffect(() => {
        if (!shouldShowTour) return;

        const tourCompleted = localStorage.getItem(TOUR_STORAGE_KEY);
        if (!tourCompleted) {
            // Delay tour start for page to load
            const timer = setTimeout(() => {
                setIsVisible(true);
                highlightCurrentStep();
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [highlightCurrentStep, shouldShowTour]);

    useEffect(() => {
        if (isVisible) {
            highlightCurrentStep();
        }
    }, [currentStep, isVisible, highlightCurrentStep]);

    const handleNext = () => {
        if (currentStep < TOUR_STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            handleComplete();
        }
    };

    const handleComplete = () => {
        localStorage.setItem(TOUR_STORAGE_KEY, 'true');
        setIsVisible(false);
    };

    const handleSkip = () => {
        handleComplete();
    };

    if (!isVisible || !targetRect) return null;

    const step = TOUR_STEPS[currentStep];
    const isLastStep = currentStep === TOUR_STEPS.length - 1;

    // Calculate tooltip position
    const getTooltipStyle = () => {
        const padding = 16;
        const tooltipWidth = 300;

        switch (step.position) {
            case 'bottom':
                return {
                    top: targetRect.bottom + padding,
                    left: Math.max(padding, Math.min(
                        targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
                        window.innerWidth - tooltipWidth - padding
                    )),
                };
            case 'top':
                return {
                    bottom: window.innerHeight - targetRect.top + padding,
                    left: Math.max(padding, targetRect.left + targetRect.width / 2 - tooltipWidth / 2),
                };
            case 'left':
                return {
                    top: targetRect.top + targetRect.height / 2 - 60,
                    right: window.innerWidth - targetRect.left + padding,
                };
            case 'right':
                return {
                    top: targetRect.top + targetRect.height / 2 - 60,
                    left: targetRect.right + padding,
                };
            default:
                return { top: targetRect.bottom + padding, left: padding };
        }
    };

    return (
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 z-[100] bg-black/50 transition-opacity"
                style={{
                    clipPath: `polygon(
                        0% 0%, 0% 100%, 
                        ${targetRect.left - 8}px 100%, 
                        ${targetRect.left - 8}px ${targetRect.top - 8}px, 
                        ${targetRect.right + 8}px ${targetRect.top - 8}px, 
                        ${targetRect.right + 8}px ${targetRect.bottom + 8}px, 
                        ${targetRect.left - 8}px ${targetRect.bottom + 8}px, 
                        ${targetRect.left - 8}px 100%, 
                        100% 100%, 100% 0%
                    )`,
                }}
            />

            {/* Highlight border */}
            <div
                className="fixed z-[101] border-2 border-emerald-500 rounded-lg pointer-events-none animate-pulse"
                style={{
                    top: targetRect.top - 4,
                    left: targetRect.left - 4,
                    width: targetRect.width + 8,
                    height: targetRect.height + 8,
                }}
            />

            {/* Tooltip */}
            <div
                className="fixed z-[102] w-[300px] bg-white rounded-xl shadow-2xl p-4 animate-in fade-in slide-in-from-bottom-2"
                style={getTooltipStyle()}
            >
                {/* Close button */}
                <button
                    onClick={handleSkip}
                    className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
                >
                    <X className="w-4 h-4" />
                </button>

                {/* Step indicator */}
                <div className="flex gap-1 mb-3">
                    {TOUR_STEPS.map((_, i) => (
                        <div
                            key={i}
                            className={`h-1 flex-1 rounded-full ${i <= currentStep ? 'bg-emerald-500' : 'bg-gray-200'
                                }`}
                        />
                    ))}
                </div>

                {/* Content */}
                <h4 className="font-semibold text-gray-900 mb-1">{step.title}</h4>
                <p className="text-sm text-gray-600 mb-4">{step.description}</p>

                {/* Actions */}
                <div className="flex justify-between items-center">
                    <button
                        onClick={handleSkip}
                        className="text-sm text-gray-500 hover:text-gray-700"
                    >
                        スキップ
                    </button>
                    <button
                        onClick={handleNext}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                        {isLastStep ? '完了' : '次へ'}
                    </button>
                </div>
            </div>
        </>
    );
}
