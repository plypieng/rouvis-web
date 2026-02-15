'use client';

import { useEffect } from 'react';
import { trackUXEvent } from '@/lib/analytics';

export default function MenuNoticeTracker({ notice }: { notice: string | null }) {
  useEffect(() => {
    if (!notice) return;
    void trackUXEvent('nav_dead_end_redirected', {
      notice,
    });
  }, [notice]);

  return null;
}
