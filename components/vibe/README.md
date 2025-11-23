# Vibe Farming Layout Components

MVP-A "Vibe Farming" UI - Chat-first farming assistant layout with IDE-style chat rail and responsive 2-column main area.

## Overview

This directory contains the main layout container and supporting components for the "Vibe Farming" experience as specified in `MVPA_UI_CONTEXT.md`.

## Components

### TodaysOverviewCard

Main overview container that integrates weather, AI recommendations, and tasks for the MVP A UI.

**Features:**
- Integrates WeatherSummaryBlock, AIRecommendationCard, and TodayTasksInlineList
- Vertical stack layout with spacing
- Auto-fetches weather and tasks on mount
- Props for task update callbacks
- Optimized for dashboard overview

**Props:**
```tsx
interface TodaysOverviewCardProps {
  selectedFieldId?: string;
  onViewRecommendationDetails?: () => void;
  className?: string;
}
```

**Example:**
```tsx
import { TodaysOverviewCard } from '@/components/vibe/TodaysOverviewCard';

<TodaysOverviewCard
  selectedFieldId="field-1"
  onViewRecommendationDetails={() => console.log('View details')}
/>
```

### AIRecommendationCard

AI recommendation display with confidence indicators and evidence badges.

**Features:**
- Show AI recommendation text with context
- Confidence indicator (high/medium/low)
- Evidence badge with source count
- Trust level color coding (emerald/amber/sky)
- Compact card design with crop-themed colors
- Click handler for viewing details

**Props:**
```tsx
interface Recommendation {
  id?: string;
  text: string;
  confidence: number; // 0-1
  evidence?: {
    sources: string[];
    count: number;
  };
  priority?: 'high' | 'medium' | 'low';
  category?: 'weather' | 'crop' | 'task' | 'general';
  actionable?: boolean;
}

interface AIRecommendationCardProps {
  recommendation: Recommendation;
  onViewDetails?: () => void;
  compact?: boolean;
}
```

**Example:**
```tsx
import { AIRecommendationCard } from '@/components/vibe/AIRecommendationCard';

const recommendation = {
  text: 'A圃場の水分不足の兆候があります。午前中の涼しい時間帯に水やりを行うことをお勧めします。',
  confidence: 0.85,
  evidence: {
    sources: ['JMA天気予報', '土壌センサーデータ', '水稲栽培ガイド'],
    count: 3,
  },
  priority: 'high',
  category: 'crop',
};

<AIRecommendationCard
  recommendation={recommendation}
  onViewDetails={() => console.log('View details')}
  compact
/>
```

### TodayTasksInlineList

Inline task checklist with priority badges and progress tracking.

**Features:**
- Checkbox list of tasks with completion state
- Priority badges (high=red, medium=amber, low=green)
- Task metadata: field, ETA, weather-dependent
- Progress indicator (e.g., "1/3 completed")
- onClick handler for task completion
- Optimistic UI updates
- Keyboard navigation support

**Props:**
```tsx
interface Task {
  id: string;
  title: string;
  field?: string;
  estimatedTime?: string;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
  weatherDependent?: boolean;
}

interface TodayTasksInlineListProps {
  tasks: Task[];
  loading?: boolean;
  onToggleTask: (taskId: string) => void;
  showProgress?: boolean;
  compact?: boolean;
}
```

**Example:**
```tsx
import { TodayTasksInlineList } from '@/components/vibe/TodayTasksInlineList';
import { useTodayTasks } from '@/hooks/useTodayTasks';

function TaskSection() {
  const { tasks, loading, toggleTask } = useTodayTasks();

  return (
    <TodayTasksInlineList
      tasks={tasks}
      loading={loading}
      onToggleTask={toggleTask}
      showProgress
      compact
    />
  );
}
```

### useTodayTasks Hook

Custom hook for fetching and managing today's tasks with optimistic updates.

**Features:**
- Fetch from /api/v1/tasks?date=today
- Filter by selectedFieldId if provided
- Return tasks array with loading/error states
- Handle task complete/uncomplete mutations
- Optimistic UI updates with rollback on error
- Auto-refresh support
- Progress metrics (completedCount, totalCount, progressPercentage)

**Return Type:**
```tsx
interface UseTodayTasksReturn {
  tasks: Task[];
  loading: boolean;
  error: Error | null;
  refreshTasks: () => Promise<void>;
  completeTask: (taskId: string) => Promise<void>;
  uncompleteTask: (taskId: string) => Promise<void>;
  toggleTask: (taskId: string) => Promise<void>;
  completedCount: number;
  totalCount: number;
  progressPercentage: number;
}
```

**Example:**
```tsx
import { useTodayTasks } from '@/hooks/useTodayTasks';

function TaskDashboard({ fieldId }: { fieldId?: string }) {
  const {
    tasks,
    loading,
    error,
    toggleTask,
    refreshTasks,
    progressPercentage,
  } = useTodayTasks({
    selectedFieldId: fieldId,
    autoRefresh: true,
    refreshInterval: 60000, // 1 minute
  });

  if (loading) return <div>Loading tasks...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <p>Progress: {progressPercentage}%</p>
      {tasks.map(task => (
        <div key={task.id} onClick={() => toggleTask(task.id)}>
          {task.title} - {task.completed ? '✓' : '○'}
        </div>
      ))}
    </div>
  );
}
```

### WeatherSummaryBlock

Compact weather summary card displaying current conditions for "Today's Overview".

**Features:**
- Current weather icon (emoji or Material Symbols)
- Temperature with high/low range
- Humidity percentage
- Wind speed and direction
- Rain probability with color-coded warnings (rose for >70%, amber for >40%)
- Compact card design with dark mode support

**Props:**
```tsx
interface WeatherSummaryBlockProps {
  temperature: number;
  humidity: number;
  windSpeed: number;
  windDirection?: string;
  condition: string;
  icon: string; // OpenWeather icon code (e.g., '01d', '10d')
  precipitation?: number; // 0-100
  highTemp?: number;
  lowTemp?: number;
}
```

**Example:**
```tsx
import { WeatherSummaryBlock } from '@/components/vibe/WeatherSummaryBlock';

<WeatherSummaryBlock
  temperature={25}
  humidity={65}
  windSpeed={8}
  windDirection="北"
  condition="晴れ時々曇り"
  icon="02d"
  precipitation={10}
  highTemp={28}
  lowTemp={22}
/>
```

### SixDayWeatherGrid

6-day forecast grid with horizontal layout for weather planning.

**Features:**
- Japanese day abbreviations (月火水木金土日) auto-calculated from date
- Weather icons (emoji) for each day
- High/low temperatures (33°/24° format)
- Responsive: horizontal scroll on mobile with scroll hint
- Border between cells
- Today highlighting with crop-50 background
- Optional precipitation indicator for days with >30% chance

**Props:**
```tsx
interface DayForecast {
  date: string; // ISO date string
  dayOfWeek: string; // Optional: 月火水木金土日 (auto-calculated if empty)
  icon: string; // OpenWeather icon code
  highTemp: number;
  lowTemp: number;
  condition?: string; // Weather condition text
  precipitation?: number; // 0-100
}

interface SixDayWeatherGridProps {
  forecast: DayForecast[];
}
```

**Example:**
```tsx
import { SixDayWeatherGrid } from '@/components/vibe/SixDayWeatherGrid';

const forecast = [
  {
    date: '2025-10-30',
    dayOfWeek: '月', // optional
    icon: '01d',
    highTemp: 28,
    lowTemp: 22,
    condition: '晴れ',
    precipitation: 0
  },
  // ... 5 more days
];

<SixDayWeatherGrid forecast={forecast} />
```

### useWeatherForecast Hook

Custom hook for fetching weather data from `/api/weather` endpoint.

**Features:**
- Fetch 6-day forecast with current conditions
- Optional fieldId parameter for field-specific weather
- Manual coordinates (lat/lon) override
- Loading and error states with Japanese error messages
- Manual refetch capability
- Optional auto-refresh interval
- Cache control for fresh data

**Return Type:**
```tsx
interface UseWeatherForecastReturn {
  current: {
    temperature: number;
    humidity: number;
    windSpeed: number;
    windDirection?: string;
    condition: string;
    icon: string;
    timestamp?: string;
  } | null;
  forecast: WeatherForecast[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}
```

**Example:**
```tsx
import { useWeatherForecast } from '@/hooks/useWeatherForecast';
import { WeatherSummaryBlock } from '@/components/vibe/WeatherSummaryBlock';
import { SixDayWeatherGrid } from '@/components/vibe/SixDayWeatherGrid';

function WeatherDashboard({ fieldId }: { fieldId?: string }) {
  const { current, forecast, loading, error, refetch } = useWeatherForecast({
    fieldId,
    refreshInterval: 300000, // refresh every 5 minutes
  });

  if (loading) return <div>読込中...</div>;
  if (error) return <div>{error}</div>;

  return (
    <>
      {current && (
        <WeatherSummaryBlock
          temperature={current.temperature}
          humidity={current.humidity}
          windSpeed={current.windSpeed}
          windDirection={current.windDirection}
          condition={current.condition}
          icon={current.icon}
        />
      )}

      <SixDayWeatherGrid
        forecast={forecast.map(day => ({
          date: day.date,
          dayOfWeek: '', // auto-calculated
          icon: day.icon,
          highTemp: day.temperature.max,
          lowTemp: day.temperature.min,
          condition: day.condition,
          precipitation: day.precipitation,
        }))}
      />
    </>
  );
}
```

### VibeFarmingLayout

Main 4-rail layout container that orchestrates the entire Vibe Farming UI.

**Features:**
- Left chat rail (360-400px fixed on desktop)
- Main 2-column responsive area (left: today's overview, right: 6-day weather & work plan)
- Right slim tool rail (64px, desktop only ≥1440px)
- Mobile chat drawer integration
- State management for selectedField and chatOpen
- Responsive breakpoints

**Props:**
- `chatRail: ReactNode` - Chat rail content (ChatKit component)
- `leftColumn: ReactNode` - Today's overview card
- `rightColumn: ReactNode` - 6-day weather & work plan
- `fields?: Field[]` - Available fields for context
- `selectedFieldId?: string` - Currently selected field ID
- `onFieldSelect?: (fieldId: string) => void` - Field selection handler
- `showEvidence?: boolean` - Evidence panel visibility
- `onToggleEvidence?: () => void` - Evidence panel toggle
- `onToggleLayout?: () => void` - Layout mode toggle (future)

**Responsive Behavior:**
- ≥1440px: All rails visible (chat left + main 2-col + tool right)
- ~1024-1440px: Chat left + main 2-col (no tool rail)
- ~768-1024px: Chat as drawer + main stacked vertically
- ≤768px: Chat as bottom sheet + main single column + FAB for chat

**Example:**
```tsx
import { VibeFarmingLayout } from '@/components/vibe';
import RouvisChatKit from '@/components/RouvisChatKit';
import TodayOverview from './TodayOverview';
import SixDayPlan from './SixDayPlan';

export default function VibeDashboard() {
  const [selectedFieldId, setSelectedFieldId] = useState('field-1');
  const [showEvidence, setShowEvidence] = useState(false);

  return (
    <VibeFarmingLayout
      chatRail={<RouvisChatKit />}
      leftColumn={<TodayOverview />}
      rightColumn={<SixDayPlan fieldId={selectedFieldId} />}
      fields={fields}
      selectedFieldId={selectedFieldId}
      onFieldSelect={setSelectedFieldId}
      showEvidence={showEvidence}
      onToggleEvidence={() => setShowEvidence(!showEvidence)}
    />
  );
}
```

### ToolRail

Right slim rail with icon buttons for desktop views (≥1440px only).

**Features:**
- Evidence panel toggle
- Layout mode toggle (future)
- Settings button (future)
- Minimal 64px width
- Tooltips on hover
- Active state highlighting

**Props:**
- `showEvidence?: boolean` - Evidence panel visibility state
- `onToggleEvidence?: () => void` - Evidence toggle handler
- `onToggleLayout?: () => void` - Layout toggle handler
- `onSettings?: () => void` - Settings handler

**Icons:**
- Evidence: visibility / visibility_off
- Layout: view_column
- Settings: settings

### ChatDrawer

Mobile bottom sheet for chat interface (≤1024px only).

**Features:**
- Bottom sheet with drag handle
- Overlay background with backdrop blur
- Smooth slide-up animation
- Body scroll lock when open
- Escape key to close
- Max height 85vh

**Props:**
- `isOpen: boolean` - Drawer open state
- `onClose: () => void` - Close handler
- `children: ReactNode` - Chat content

## Design Tokens

All components follow the design tokens from `MVPA_UI_CONTEXT.md`:

### Colors (Tailwind classes)
- **Primary/Accent Green:** `text-crop-600/700`, `bg-crop-100/200`, `border-crop-300`
- **Forest Green:** `text-crop-900`, `dark:text-white`
- **Light Gray:** `bg-secondary-50`, `bg-white`, `border-secondary-200`
- **Sage Green:** `text-secondary-600`, `border-secondary-300`
- **Accent Blue:** `text-sky-600`, `bg-sky-100/200`, `border-sky-300`
- **Background Light:** `bg-secondary-50`
- **Background Dark:** `dark:bg-[#1C2A3C]`

### Icons
- Material Symbols Outlined via `<span class="material-symbols-outlined">`
- Icon classes: `text-xl`, `!text-base`, `!text-[14px]`

### Spacing & Layout
- Chat rail width: `w-[380px]` (lg), `w-[400px]` (xl)
- Tool rail width: `w-16` (64px)
- Main padding: `p-4` (mobile), `p-6` (desktop)
- Gap: `gap-4` (mobile), `gap-6` (desktop)

### Shadows
- Card: `shadow-sm`, `shadow`
- Drawer: `shadow-xl`

### Responsive Breakpoints
- Mobile: default (≤768px)
- Tablet: `lg:` (~768-1024px)
- Desktop: `xl:` (≥1440px)

## i18n Keys

Components use the following i18n keys from `web/messages/ja.json`:

### Existing Keys
- `navigation.chat` - "AIチャット"

### Missing Keys (Need to Add)
- `common.close` - "閉じる" (currently using fallback)
- `evidence.toggle` - "根拠パネルを切替" (currently using fallback)
- `layout.toggle` - "レイアウトを切替" (currently using fallback)
- `navigation.settings` - "設定" (currently using fallback)

### Suggested Additions to ja.json

```json
{
  "common": {
    "close": "閉じる",
    "open": "開く",
    "toggle": "切替"
  },
  "evidence": {
    "toggle": "根拠パネルを切替",
    "show": "根拠を表示",
    "hide": "根拠を非表示"
  },
  "layout": {
    "toggle": "レイアウトを切替",
    "compact": "コンパクト表示",
    "expanded": "拡張表示"
  },
  "navigation": {
    "dashboard": "ダッシュボード",
    "planner": "畑プランナー",
    "calendar": "カレンダー",
    "analytics": "分析",
    "community": "コミュニティ",
    "chat": "AIチャット",
    "settings": "設定"
  }
}
```

## Integration Example

Here's a complete example of integrating the Vibe Farming Layout into a page:

```tsx
// app/[locale]/vibe/page.tsx
'use client';

import { useState } from 'react';
import { VibeFarmingLayout } from '@/components/vibe';
import RouvisChatKit from '@/components/RouvisChatKit';
import WeatherSummaryBlock from '@/components/vibe/WeatherSummaryBlock';
import TodayTasksInlineList from '@/components/vibe/TodayTasksInlineList';
import SixDayWeatherGrid from '@/components/vibe/SixDayWeatherGrid';
import FieldMetadataCard from '@/components/vibe/FieldMetadataCard';

export default function VibeDashboardPage() {
  const [selectedFieldId, setSelectedFieldId] = useState('field-1');
  const [showEvidence, setShowEvidence] = useState(false);

  // Fetch fields from API or state
  const fields = [
    { id: 'field-1', name: '第一圃場', crop: 'コシヒカリ', area: 1.2 },
    { id: 'field-2', name: '第二圃場', crop: 'キャベツ', area: 0.8 },
  ];

  return (
    <VibeFarmingLayout
      // Chat rail (left, desktop only)
      chatRail={
        <RouvisChatKit
          sessionId="vibe-session"
          selectedFieldId={selectedFieldId}
        />
      }

      // Left column - Today's overview
      leftColumn={
        <>
          <WeatherSummaryBlock />
          <div className="rounded-lg border border-secondary-200 bg-white p-4 shadow-sm dark:border-secondary-700 dark:bg-background/50">
            <h2 className="mb-3 text-lg font-bold text-crop-900 dark:text-white">
              AI推奨事項
            </h2>
            {/* AI recommendations content */}
          </div>
          <TodayTasksInlineList fieldId={selectedFieldId} />
        </>
      }

      // Right column - 6-day weather & work plan
      rightColumn={
        <>
          <SixDayWeatherGrid
            fieldId={selectedFieldId}
            onFieldSelect={setSelectedFieldId}
            fields={fields}
          />
          <FieldMetadataCard fieldId={selectedFieldId} />
        </>
      }

      // State and handlers
      fields={fields}
      selectedFieldId={selectedFieldId}
      onFieldSelect={setSelectedFieldId}
      showEvidence={showEvidence}
      onToggleEvidence={() => setShowEvidence(!showEvidence)}
      onToggleLayout={() => {
        // Future: toggle between compact/expanded layouts
        console.log('Layout toggle');
      }}
    />
  );
}
```

## Feature Flags Integration

Components respect the following feature flags from environment variables:

- `VISION_LITE_ENABLED` - Enable image attachment/diagnosis in chat (affects RouvisChatKit within chatRail)
- `AGENTKIT_ENABLED` - Use AgentKit for chat backend (affects chat streaming)
- `TERSE_MODE_THRESHOLD` - Budget-aware concise mode (affects chat responses)

These are handled by the components passed as props (e.g., RouvisChatKit), not by the layout itself.

## Accessibility

All components include:
- Proper ARIA labels and roles
- Keyboard navigation support
- Focus management (especially for drawer/modal)
- Contrast-compliant colors (WCAG AA)
- Screen reader announcements

## File Structure

```
web/components/vibe/
├── VibeFarmingLayout.tsx    # Main 4-rail container
├── ToolRail.tsx              # Right slim tool rail
├── ChatDrawer.tsx            # Mobile chat bottom sheet
├── index.ts                  # Barrel exports
└── README.md                 # This file
```

## Related Documentation

- **Design Spec:** `/Users/modoki/Documents/rouvis/web/MVPA_UI_CONTEXT.md`
- **Implementation Plan:** `/Users/modoki/Documents/rouvis/MVP_A_VIBE_FARMING_PLAN.md`
- **Page Structure:** `/Users/modoki/Documents/rouvis/web/PAGES.md`
- **Tailwind Config:** `/Users/modoki/Documents/rouvis/web/tailwind.config.js`
- **i18n Config:** `/Users/modoki/Documents/rouvis/web/i18n.ts`

## Next Steps

To use these components:

1. **Add missing i18n keys** to `web/messages/ja.json` and `web/messages/en.json`
2. **Create content components** for leftColumn and rightColumn slots:
   - WeatherSummaryBlock (weather hero)
   - TodayTasksInlineList (task checklist)
   - SixDayWeatherGrid (6-day forecast with work blocks)
   - FieldMetadataCard (field details)
3. **Integrate with existing ChatKit** - Pass RouvisChatKit as chatRail prop
4. **Add evidence panel** - Create TrustEvidencePanel and connect to onToggleEvidence
5. **Wire up API endpoints** - Connect to `/v1/chat/stream`, `/v1/tasks`, `/v1/weather`

## Design Philosophy

These components follow the "Vibe Farming" design philosophy:

- **Chat-first:** Conversation is the primary interface
- **IDE-style layout:** Fixed chat rail like VSCode's sidebar
- **Mobile-responsive:** Graceful degradation to bottom sheet on mobile
- **Minimal chrome:** Focus on content, not UI furniture
- **JP-first:** All text in Japanese with JA-optimized spacing
- **Accessible:** Keyboard, screen reader, and touch-friendly
