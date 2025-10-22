'use client';

import { useTranslations } from 'next-intl';
import { Droplets, Camera, HelpCircle, Calendar } from 'lucide-react';

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

  const actions = [
    {
      id: 'log-activity',
      label: t('quick_actions.log_activity'),
      icon: Droplets,
      color: 'bg-blue-500 hover:bg-blue-600 border-blue-600',
      action: () => {
        // TODO: Open chat with pre-filled "水やり 20L をA圃場に記録"
        console.log('Log activity');
      },
    },
    {
      id: 'ask-question',
      label: t('quick_actions.ask'),
      icon: HelpCircle,
      color: 'bg-green-500 hover:bg-green-600 border-green-600',
      action: () => {
        // TODO: Focus chat input
        console.log('Ask question');
      },
    },
    {
      id: 'take-photo',
      label: t('quick_actions.take_photo'),
      icon: Camera,
      color: 'bg-purple-500 hover:bg-purple-600 border-purple-600',
      action: () => {
        // TODO: Open camera/file picker
        console.log('Take photo');
      },
    },
    {
      id: 'week-plan',
      label: t('quick_actions.week_plan'),
      icon: Calendar,
      color: 'bg-orange-500 hover:bg-orange-600 border-orange-600',
      action: () => {
        // TODO: Navigate to week view or open calendar
        console.log('Show week plan');
      },
    },
  ];

  return (
    <div className="mobile-card">
      <h2 className="text-mobile-lg font-semibold text-gray-900 mb-4">{t('quick_actions.title')}</h2>
      <div className="mobile-grid-2 gap-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              onClick={action.action}
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
            </button>
          );
        })}
      </div>

      {/* Voice Input Button - Prominent for field use - Mobile optimized */}
      <button
        className="
          w-full mt-4 bg-gradient-to-r from-green-500 to-green-600
          hover:from-green-600 hover:to-green-700
          text-white rounded-lg mobile-spacing
          flex items-center justify-center gap-3
          transition-all duration-200 mobile-tap
          border-2 border-green-600 shadow-md hover:shadow-lg
          min-h-[56px]
        "
        onClick={() => {
          // TODO: Start voice input
          console.log('Start voice input');
        }}
        aria-label={t('quick_actions.voice_input')}
      >
        <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
          />
        </svg>
        <span className="font-semibold text-mobile-base">{t('quick_actions.voice_input')}</span>
      </button>

      <p className="text-mobile-sm text-gray-500 text-center mt-3">
        {t('quick_actions.voice_help')}
      </p>
    </div>
  );
}
