import { describe, expect, it } from 'vitest';

import { buildQuickActionTargets } from './quick-actions';

describe('buildQuickActionTargets', () => {
  it('maps dashboard quick actions to real localized workflow routes', () => {
    const targets = buildQuickActionTargets('ja');

    expect(targets.logActivity).toBe('/ja/records?action=log&source=quick-action');
    expect(targets.weekPlan).toBe('/ja/calendar?view=week&source=quick-action');
    expect(targets.voiceInput).toBe('/ja/records?action=voice&source=quick-action');
    expect(targets.askQuestion).toContain('/ja/chat?');
    expect(targets.askQuestion).toContain('intent=today');
    expect(targets.askQuestion).toContain('mode=default');
    expect(targets.takePhoto).toContain('/ja/chat?');
    expect(targets.takePhoto).toContain('mode=diagnosis');
    expect(targets.takePhoto).toContain('intent=project');
  });
});
