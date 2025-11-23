'use client';

import { useState, ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import ChatDrawer from './ChatDrawer';
import ToolRail from './ToolRail';

export interface Field {
  id: string;
  name: string;
  crop?: string;
  area?: number;
}

export interface VibeFarmingLayoutProps {
  /**
   * Chat rail content (ChatKit component)
   */
  chatRail: ReactNode;

  /**
   * Main content area - left column (Today's overview card)
   */
  leftColumn: ReactNode;

  /**
   * Main content area - right column (6-day weather & work plan)
   */
  rightColumn: ReactNode;

  /**
   * Available fields for context
   */
  fields?: Field[];

  /**
   * Currently selected field ID
   */
  selectedFieldId?: string;

  /**
   * Field selection handler
   */
  onFieldSelect?: (fieldId: string) => void;

  /**
   * Evidence panel visibility (controlled by ToolRail)
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
}

/**
 * VibeFarmingLayout - Main 4-rail layout container for MVP-A "Vibe Farming" UI
 *
 * Layout structure:
 * - Desktop (≥1024px): Left chat rail (360-400px) + Main 2-column area + Right tool rail (64px)
 * - Tablet (~768-1024px): Chat as drawer + Main content stacked vertically
 * - Mobile (≤768px): Chat as bottom sheet + Main content single column
 *
 * Design tokens from MVPA_UI_CONTEXT.md:
 * - Colors: crop-*, secondary-*, sky-* palettes
 * - Layout: Fixed left rail, responsive main area, minimal right rail
 * - Icons: Material Symbols Outlined
 */
export default function VibeFarmingLayout({
  chatRail,
  leftColumn,
  rightColumn,
  fields = [],
  selectedFieldId,
  onFieldSelect,
  showEvidence = false,
  onToggleEvidence,
  onToggleLayout,
}: VibeFarmingLayoutProps) {
  const t = useTranslations();
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-secondary-50 dark:bg-[#1C2A3C]">
      {/* Left Chat Rail - Desktop only (≥1024px) */}
      <aside className="hidden shrink-0 lg:flex lg:w-[380px] xl:w-[400px] flex-col border-r border-secondary-200 bg-white dark:border-secondary-700 dark:bg-background/50">
        {chatRail}
      </aside>

      {/* Main Content Area */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Main 2-Column Grid */}
        <div className="flex flex-1 overflow-hidden">
          {/* Responsive container */}
          <div
            className="flex flex-1 flex-col gap-2 overflow-y-auto pl-2 pr-1 py-2 lg:flex-row lg:gap-3 lg:pl-3 lg:pr-2 lg:py-3"
            style={{ scrollbarGutter: 'stable' }}
          >
            {/* Left Column - Today's Overview */}
            <section className="flex min-w-0 flex-1 flex-col gap-4 pr-1 lg:pr-2">
              {leftColumn}
            </section>

            {/* Right Column - 6-Day Weather & Work Plan */}
            <section className="flex min-w-0 flex-1 flex-col gap-4 lg:flex-[1.2] pr-1 lg:pr-4">
              {rightColumn}
            </section>
          </div>
        </div>

        {/* Mobile Chat FAB - Mobile/Tablet only (≤1024px) */}
        <button
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-crop-600 text-white shadow-lg transition-transform hover:scale-105 active:scale-95 lg:hidden"
          aria-label={t('navigation.chat')}
        >
          <span className="material-symbols-outlined text-2xl">chat</span>
        </button>
      </main>

      {/* Right Tool Rail - Desktop only (≥1440px) */}
      <aside className="hidden xl:flex">
        <ToolRail
          showEvidence={showEvidence}
          onToggleEvidence={onToggleEvidence}
          onToggleLayout={onToggleLayout}
        />
      </aside>

      {/* Mobile Chat Drawer - Mobile/Tablet only (≤1024px) */}
      <ChatDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      >
        {chatRail}
      </ChatDrawer>
    </div>
  );
}
