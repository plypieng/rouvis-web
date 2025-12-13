'use client';

/**
 * Skeleton loading components for dashboard and project views.
 * Provides visual feedback during data loading to reduce perceived wait time.
 */

// Basic shimmer animation class
const shimmer = "relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent";

// Project Card Skeleton
export function ProjectCardSkeleton() {
    return (
        <div className={`bg-card rounded-xl border border-border p-5 ${shimmer}`}>
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
                <div className="space-y-2">
                    <div className="h-5 w-32 bg-gray-200 rounded" />
                    <div className="h-4 w-24 bg-gray-100 rounded" />
                </div>
                <div className="text-right space-y-1">
                    <div className="h-6 w-8 bg-gray-200 rounded" />
                    <div className="h-3 w-10 bg-gray-100 rounded" />
                </div>
            </div>

            {/* Info rows */}
            <div className="space-y-3">
                <div className="flex justify-between">
                    <div className="h-4 w-16 bg-gray-100 rounded" />
                    <div className="h-4 w-20 bg-gray-200 rounded" />
                </div>
                <div className="flex justify-between">
                    <div className="h-4 w-16 bg-gray-100 rounded" />
                    <div className="h-4 w-24 bg-gray-200 rounded" />
                </div>
            </div>

            {/* Footer */}
            <div className="mt-4 pt-3 border-t border-border flex justify-between">
                <div className="h-3 w-16 bg-gray-100 rounded" />
                <div className="h-3 w-12 bg-gray-100 rounded" />
            </div>
        </div>
    );
}

// Dashboard Skeleton (full page loading state)
export function DashboardSkeleton() {
    return (
        <div className="min-h-screen bg-background font-sans animate-pulse">
            {/* Header placeholder */}
            <div className="h-16 bg-card border-b border-border" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Weather card skeleton */}
                <div className={`bg-card rounded-xl p-4 mb-6 ${shimmer}`}>
                    <div className="flex justify-between items-center">
                        <div className="space-y-2">
                            <div className="h-5 w-24 bg-gray-200 rounded" />
                            <div className="h-4 w-32 bg-gray-100 rounded" />
                        </div>
                        <div className="h-12 w-12 bg-gray-200 rounded-full" />
                    </div>
                </div>

                {/* Today's Focus skeleton */}
                <div className={`bg-card rounded-xl p-4 mb-6 ${shimmer}`}>
                    <div className="h-5 w-32 bg-gray-200 rounded mb-4" />
                    <div className="space-y-2">
                        <div className="h-10 w-full bg-gray-100 rounded" />
                        <div className="h-10 w-full bg-gray-100 rounded" />
                    </div>
                </div>

                {/* Projects section header */}
                <div className="flex justify-between items-center mb-6">
                    <div className="h-6 w-32 bg-gray-200 rounded" />
                    <div className="h-10 w-36 bg-primary/30 rounded-lg" />
                </div>

                {/* Project cards grid */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <ProjectCardSkeleton />
                    <ProjectCardSkeleton />
                    <ProjectCardSkeleton />
                </div>
            </div>
        </div>
    );
}

// Chat Message Skeleton
export function ChatMessageSkeleton({ isUser = false }: { isUser?: boolean }) {
    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
            <div className={`max-w-[80%] ${shimmer}`}>
                {!isUser && (
                    <div className="h-8 w-8 bg-gray-200 rounded-full mb-2" />
                )}
                <div className={`rounded-2xl p-4 ${isUser ? 'bg-primary/20' : 'bg-gray-100'}`}>
                    <div className="space-y-2">
                        <div className="h-4 w-48 bg-gray-200 rounded" />
                        <div className="h-4 w-32 bg-gray-200 rounded" />
                    </div>
                </div>
            </div>
        </div>
    );
}

// Simple inline loading text with dots animation
export function LoadingDots() {
    return (
        <span className="inline-flex items-center gap-1">
            <span className="animate-bounce delay-0">.</span>
            <span className="animate-bounce delay-100">.</span>
            <span className="animate-bounce delay-200">.</span>
        </span>
    );
}
