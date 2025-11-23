'use client';

import { useTranslations } from 'next-intl';

export interface ToolRailProps {
  /**
   * Evidence panel visibility state
   */
  showEvidence?: boolean;

  /**
   * Evidence panel toggle handler
   */
  onToggleEvidence?: () => void;

  /**
   * Layout mode toggle handler (future use)
   */
  onToggleLayout?: () => void;

  /**
   * Settings button handler (future use)
   */
  onSettings?: () => void;
}

/**
 * ToolRail - Right slim rail with icon buttons for desktop views
 *
 * Features:
 * - Evidence panel toggle
 * - Layout mode toggle (future)
 * - Settings access
 *
 * Design:
 * - Minimal 64px width
 * - Border-left separator
 * - Vertical icon stack
 * - Active state highlighting
 * - Hidden on mobile/tablet (≤1440px)
 *
 * Design tokens from MVPA_UI_CONTEXT.md:
 * - Icons: Material Symbols Outlined
 * - Colors: crop-* for active states, secondary-* for neutral
 */
export default function ToolRail({
  showEvidence = false,
  onToggleEvidence,
  onToggleLayout,
  onSettings,
}: ToolRailProps) {
  const t = useTranslations();

  return (
    <div className="flex w-16 shrink-0 flex-col items-center gap-2 border-l border-secondary-200 bg-white py-4 dark:border-secondary-700 dark:bg-background/50">
      {/* Evidence Panel Toggle */}
      {onToggleEvidence && (
        <button
          onClick={onToggleEvidence}
          className={`group relative flex h-12 w-12 items-center justify-center rounded-lg transition-colors ${
            showEvidence
              ? 'bg-crop-100 text-crop-700 dark:bg-crop-200/20 dark:text-crop-400'
              : 'text-secondary-600 hover:bg-secondary-100 hover:text-secondary-900 dark:text-secondary-400 dark:hover:bg-secondary-700/50 dark:hover:text-white'
          }`}
          aria-label={t('evidence.toggle') || 'Toggle evidence panel'}
          aria-pressed={showEvidence}
          title={t('evidence.toggle') || 'Toggle evidence panel'}
        >
          <span className="material-symbols-outlined text-xl">
            {showEvidence ? 'visibility' : 'visibility_off'}
          </span>

          {/* Tooltip */}
          <div className="pointer-events-none absolute right-full mr-2 hidden whitespace-nowrap rounded bg-secondary-900 px-2 py-1 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 dark:bg-secondary-800">
            {t('evidence.toggle') || 'Toggle evidence'}
          </div>
        </button>
      )}

      {/* Divider */}
      {onToggleEvidence && (onToggleLayout || onSettings) && (
        <div className="h-px w-8 bg-secondary-200 dark:bg-secondary-700" />
      )}

      {/* Layout Toggle */}
      {onToggleLayout && (
        <button
          onClick={onToggleLayout}
          className="group relative flex h-12 w-12 items-center justify-center rounded-lg text-secondary-600 transition-colors hover:bg-secondary-100 hover:text-secondary-900 dark:text-secondary-400 dark:hover:bg-secondary-700/50 dark:hover:text-white"
          aria-label={t('layout.toggle') || 'Toggle layout'}
          title={t('layout.toggle') || 'Toggle layout'}
        >
          <span className="material-symbols-outlined text-xl">
            view_column
          </span>

          {/* Tooltip */}
          <div className="pointer-events-none absolute right-full mr-2 hidden whitespace-nowrap rounded bg-secondary-900 px-2 py-1 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 dark:bg-secondary-800">
            {t('layout.toggle') || 'Toggle layout'}
          </div>
        </button>
      )}

      {/* Spacer - Push settings to bottom */}
      <div className="flex-1" />

      {/* Settings Button */}
      {onSettings && (
        <button
          onClick={onSettings}
          className="group relative flex h-12 w-12 items-center justify-center rounded-lg text-secondary-600 transition-colors hover:bg-secondary-100 hover:text-secondary-900 dark:text-secondary-400 dark:hover:bg-secondary-700/50 dark:hover:text-white"
          aria-label={t('navigation.settings') || 'Settings'}
          title={t('navigation.settings') || 'Settings'}
        >
          <span className="material-symbols-outlined text-xl">
            settings
          </span>

          {/* Tooltip */}
          <div className="pointer-events-none absolute right-full mr-2 hidden whitespace-nowrap rounded bg-secondary-900 px-2 py-1 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 dark:bg-secondary-800">
            {t('navigation.settings') || 'Settings'}
          </div>
        </button>
      )}
    </div>
  );
}
