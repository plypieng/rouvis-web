# Compact Chat Components

Optimized chat components for narrow layouts (360-400px left rail, mobile drawers).

## Components

### RouvisChatKit_Compact

Main compact chat interface optimized for MVP A UI left rail.

**Features:**
- Fixed width design (360-400px)
- Vertical stacking layout
- Collapsible evidence tray
- Vision button with feature flag support
- Hidden on mobile (`lg:flex`), shown via drawer instead

**Usage:**

```tsx
import { RouvisChatKit_Compact } from '@/components/chat';

export default function LeftRail() {
  return (
    <div className="hidden lg:flex w-[360px] h-screen">
      <RouvisChatKit_Compact />
    </div>
  );
}
```

**Feature Flags:**
- `NEXT_PUBLIC_VISION_LITE_ENABLED=true` - Enable photo attachment button

### CompactEvidenceTray

Collapsible evidence section for guidebook citations.

**Features:**
- Toggle button with citation count
- Aggregate confidence indicator
- Scrollable citation list
- Natural language, farmer-friendly

**Usage:**

```tsx
import { CompactEvidenceTray } from '@/components/chat';

<CompactEvidenceTray
  citations={guidebookCitations}
  defaultOpen={false}
/>
```

### CompactEvidenceBadge

Minimal inline badge for evidence summary (optional utility component).

**Usage:**

```tsx
import { CompactEvidenceBadge } from '@/components/chat';

<CompactEvidenceBadge
  citationCount={5}
  avgConfidence={0.85}
  onClick={() => setEvidenceTrayOpen(true)}
/>
```

## Design Principles

1. **Width Optimization** - Designed for 360-400px fixed width
2. **Vertical Layout** - No flex-row layouts, stack everything vertically
3. **Collapsible Evidence** - Evidence rail becomes collapsible section
4. **Touch-Friendly** - Large hit targets, smooth animations
5. **Minimal Chrome** - Maximum content, minimal UI decoration
6. **Farmer-First** - Natural language, no technical jargon

## Integration with Full RouvisChatKit

The compact version reuses core logic from `RouvisChatKit.tsx` but with:
- Simplified state management (no activities/tasks cards in left rail)
- Compact ChatKit theme (`density: 'compact'`)
- Evidence as collapsible tray instead of separate rail
- Conditional vision button based on feature flag

## Responsive Behavior

Use Tailwind responsive classes for proper display:

```tsx
{/* Desktop: Left rail */}
<div className="hidden lg:flex lg:w-[360px]">
  <RouvisChatKit_Compact />
</div>

{/* Mobile: Drawer */}
<Drawer>
  <RouvisChatKit_Compact />
</Drawer>
```

## Environment Variables

Required for feature flag support:

```env
NEXT_PUBLIC_VISION_LITE_ENABLED=true  # Enable vision features
```

## Related Components

- `RouvisChatKit.tsx` - Full-width chat with separate evidence rail
- `GuidebookEvidenceCard.tsx` - Individual citation card
- `ConfidenceIndicator.tsx` - Confidence score visualization
- `ErrorBoundary.tsx` - Error handling wrapper
