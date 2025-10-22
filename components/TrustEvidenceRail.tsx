'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { EvidenceCard } from './EvidenceCard';
import { RAGContextBadge } from './RAGContextBadge';
import type { Citation, RAGContext } from '@/types/chat';

/**
 * TrustEvidenceRail - Right-side rail for trust badges and natural evidence
 *
 * TODO hooks:
 * - SSE: Subscribe to citations stream -> setCitations(events)
 * - Integrate with agent/tool events to surface EvidenceCard entries
 */
export function TrustEvidenceRail({ className = '' }: { className?: string }) {
  const t = useTranslations();

  // Placeholder RAG context; replace via SSE/props when wired
  const [ragContext, setRagContext] = useState<RAGContext>({
    relevanceScore: 0.82,
    chunks: 3,
    guidebooks: ['新潟県稲作ガイド 2023', 'JA新潟 推奨手順 2024', 'JMA 長岡 気象データ'],
  });

  // Placeholder citations from future SSE
  const [citations, setCitations] = useState<Citation[]>([]);

  useEffect(() => {
    // TODO: SSE subscription for citations
    // const es = new EventSource('/v1/citations/stream');
    // es.onmessage = (e) => { setCitations(JSON.parse(e.data)); };
    // return () => es.close();
  }, []);

  const badgeJMA = t('trust.badges.jma_official');
  const badgeCenter = t('trust.badges.agri_center');
  const badgeJA = t('trust.badges.ja_niigata');

  const evidenceSummary = `${t('trust.evidence_rail')}: ${badgeJMA}・${badgeCenter}・${badgeJA}`;

  return (
    <aside
      role="complementary"
      aria-label={t('trust.evidence_rail')}
      aria-live="polite"
      className={`bg-white rounded-lg border border-gray-200 p-3 ${className}`}
    >
      {/* Badges + RAG Badge */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-gray-700 mr-1">
          {t('trust.evidence_rail')}:
        </span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
          {badgeJMA}
        </span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
          {badgeCenter}
        </span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
          {badgeJA}
        </span>
        <RAGContextBadge context={ragContext} className="ml-auto" />
      </div>

      {/* Natural evidence card */}
      <div className="mt-3">
        <EvidenceCard
          type="citation"
          content={evidenceSummary}
          citations={citations}
          collapsible={false}
          defaultExpanded={false}
          // TODO: When SSE is wired, feed stream events into EvidenceCard as needed
        />
      </div>
    </aside>
  );
}