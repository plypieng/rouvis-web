'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { ArrowRight } from 'lucide-react';

/**
 * Banner shown to users who haven't completed their profile.
 * Soft nudge to complete onboarding without blocking.
 */
export default function ProfileIncompleteBanner({ locale }: { locale: string }) {
    const { data: session } = useSession();

    // Check if session has the onboardingComplete flag
    const onboardingComplete = (session?.user as any)?.onboardingComplete;

    // Don't show banner if onboarding is complete
    if (onboardingComplete) {
        return null;
    }

    return (
        <div className="bg-amber-50 border-b border-amber-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
                <div className="flex items-center justify-between gap-4">
                    <p className="text-sm text-amber-800">
                        プロフィールを完成させて、より正確なアドバイスを受け取りましょう
                    </p>
                    <Link
                        href={`/${locale}/onboarding`}
                        className="flex-shrink-0 text-sm font-medium text-amber-700 hover:text-amber-900 flex items-center gap-1"
                    >
                        設定する
                        <ArrowRight className="w-3 h-3" />
                    </Link>
                </div>
            </div>
        </div>
    );
}
