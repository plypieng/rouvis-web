'use client';

import { useEffect, ReactNode } from 'react';
import { useTranslations } from 'next-intl';

export interface ChatDrawerProps {
  /**
   * Drawer open state
   */
  isOpen: boolean;

  /**
   * Close handler
   */
  onClose: () => void;

  /**
   * Chat content (ChatKit component)
   */
  children: ReactNode;
}

/**
 * ChatDrawer - Mobile bottom sheet for chat interface
 *
 * Features:
 * - Bottom sheet with drag handle
 * - Overlay background with blur
 * - Smooth slide-up animation
 * - Portal-like z-index stacking
 * - Body scroll lock when open
 *
 * Design:
 * - Max height 85vh (leaves room for status bar)
 * - Rounded top corners
 * - Backdrop blur for depth
 * - Hidden on desktop (≥1024px)
 *
 * Design tokens from MVPA_UI_CONTEXT.md:
 * - Colors: white bg, secondary-* for handle and borders
 * - Shadows: shadow-xl for elevation
 */
export default function ChatDrawer({
  isOpen,
  onClose,
  children,
}: ChatDrawerProps) {
  const t = useTranslations();

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <>
      {/* Overlay - only visible on mobile/tablet */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity lg:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Sheet - only visible on mobile/tablet */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col rounded-t-2xl bg-white shadow-xl transition-transform dark:bg-background lg:hidden"
        role="dialog"
        aria-modal="true"
        aria-label={t('navigation.chat')}
      >
        {/* Drag Handle Bar */}
        <div className="flex shrink-0 items-center justify-center py-3">
          <div className="h-1 w-12 rounded-full bg-secondary-300 dark:bg-secondary-600" />
        </div>

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-secondary-200 px-4 pb-3 dark:border-secondary-700">
          <h2 className="text-lg font-bold text-crop-900 dark:text-white">
            {t('navigation.chat')}
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-secondary-600 transition-colors hover:bg-secondary-100 dark:text-secondary-400 dark:hover:bg-secondary-700/50"
            aria-label={t('common.close') || 'Close'}
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Chat Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </>
  );
}
