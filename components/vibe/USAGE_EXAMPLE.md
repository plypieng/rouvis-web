# Weather Work Plan Card - Usage Examples

## Overview

The Weather Work Plan Card is a comprehensive component for managing field-specific work schedules alongside 6-day weather forecasts.

## Files Created

1. **WeatherWorkPlanCard.tsx** - Main container component
2. **FieldSelectorCompact.tsx** - Compact field dropdown
3. **WorkBlocksEditor.tsx** - Inline work blocks editor
4. **FieldMetadataSummary.tsx** - Field info display
5. **useFieldMetadata.ts** - Custom hook for field data
6. **useWorkBlocks.ts** - Custom hook for work blocks

## Basic Usage

```tsx
import { WeatherWorkPlanCard } from '@/components/vibe';

export default function MyPage() {
  return <WeatherWorkPlanCard />;
}
```

## API Requirements

- GET /api/v1/fields - List fields
- GET /api/v1/fields/:id - Get field metadata
- GET /api/v1/tasks - List work blocks
- POST /api/v1/tasks - Create work block
- GET /api/weather - 6-day forecast
