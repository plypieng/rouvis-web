'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { Droplets, Camera, HelpCircle, Calendar, Mic } from 'lucide-react';
import { buildQuickActionTargets } from '@/lib/quick-actions';

/**
 * Quick Action Buttons - Large touch targets for field use
 *
 * Principles (FARMER_UX_VISION.md):
 * - Minimum 44pt x 44pt touch targets (Apple HIG)
 * - Works with gloves in rice paddies
 * - One-tap actions for common tasks
 * - Natural labels (not technical terms)
 */
export function QuickActionButtons() {
  const t = useTranslations();
  const locale = useLocale();
  const targets = buildQuickActionTargets(locale);

  const actions = [
    {
      id: 'log-activity',
      label: t('quick_actions.log_activity'),
      icon: Droplets,
      color: 'bg-blue-500 hover:bg-blue-600 border-blue-600',
      href: targets.logActivity,
    },
    {
      id: 'ask-question',
      label: t('quick_actions.ask'),
      icon: HelpCircle,
      color: 'bg-green-500 hover:bg-green-600 border-green-600',
      href: targets.askQuestion,
    },
    {
      id: 'take-photo',
      label: t('quick_actions.take_photo'),
      icon: Camera,
      color: 'bg-purple-500 hover:bg-purple-600 border-purple-600',
      href: targets.takePhoto,
    },
    {
      id: 'week-plan',
      label: t('quick_actions.week_plan'),
      icon: Calendar,
      color: 'bg-orange-500 hover:bg-orange-600 border-orange-600',
      href: targets.weekPlan,
    },
  ];

  return (
    <div className="mobile-card">
      <h2 className="text-mobile-lg font-semibold text-gray-900 mb-4">{t('quick_actions.title')}</h2>
      <div className="mobile-grid-2 gap-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.id}
              href={action.href}
              data-testid={`quick-action-${action.id}`}
              className={`
                ${action.color}
                text-white rounded-lg mobile-spacing
                flex flex-col items-center justify-center gap-2
                transition-all duration-200 mobile-tap
                border-2 shadow-sm hover:shadow-md
                min-h-[88px]
              `}
              aria-label={action.label}
            >
              <Icon className="w-8 h-8" strokeWidth={2} />
              <span className="text-mobile-sm font-medium text-center leading-tight">
                {action.label}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Voice Input Button - Prominent for field use - Mobile optimized */}
      <Link
        href={targets.voiceInput}
        data-testid="quick-action-voice-input"
        className="
          w-full mt-4 bg-gradient-to-r from-green-500 to-green-600
          hover:from-green-600 hover:to-green-700
          text-white rounded-lg mobile-spacing
          flex items-center justify-center gap-3
          transition-all duration-200 mobile-tap
          border-2 border-green-600 shadow-md hover:shadow-lg
          min-h-[56px]
        "
        aria-label={t('quick_actions.voice_input')}
      >
        <Mic className="w-6 h-6 flex-shrink-0" strokeWidth={2} />
        <span className="font-semibold text-mobile-base">{t('quick_actions.voice_input')}</span>
      </Link>

      <p className="text-mobile-sm text-gray-500 text-center mt-3">
        {t('quick_actions.voice_help')}
      </p>
    </div>
  );
}
