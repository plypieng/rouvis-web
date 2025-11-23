'use client';

import Link from 'next/link';
import { GuidebookEvidenceCard, GuidebookEvidenceRail, GuidebookCitation } from '@/components/GuidebookEvidenceCard';

/**
 * Test page for Guidebook Evidence Cards
 *
 * This page is used to visually verify the styling and functionality
 * of the GuidebookEvidenceCard and GuidebookEvidenceRail components
 * with mock Japanese farming guidebook citations.
 *
 * Access at: http://localhost:3000/ja/test-evidence
 */

export default function TestEvidencePage() {
  // Mock citations with various confidence levels and content
  const mockCitations: GuidebookCitation[] = [
    {
      source: '葉茎菜類.pdf',
      page: 12,
      confidence: 0.89,
      excerpt: 'キャベツの霜対策として、マルチングや不織布による被覆が効果的です。特に夜間の冷え込みが予想される場合は、前日の夕方までに実施することが重要です。',
      fullText: 'キャベツの霜対策として、マルチングや不織布による被覆が効果的です。特に夜間の冷え込みが予想される場合は、前日の夕方までに実施することが重要です。マルチングには稲わらや黒マルチフィルムを使用し、地温の保持と霜の直接的な影響を防ぎます。不織布は通気性があり、光を通すため、日中の生育を妨げることなく保温効果が得られます。被覆は気温が5°C以下になることが予想される場合に特に効果的で、朝方の霜害を大幅に軽減できます。',
      metadata: {
        guidebook: '新潟県葉茎菜類栽培指導書',
        section: '第3章 病害虫・生理障害対策',
        topic: '霜対策',
      },
    },
    {
      source: '葉茎菜類.pdf',
      page: 24,
      confidence: 0.76,
      excerpt: '追肥のタイミングは定植後3-4週間が目安です。窒素成分で10kg/10aを標準とし、生育状況に応じて調整してください。',
      fullText: '追肥のタイミングは定植後3-4週間が目安です。窒素成分で10kg/10aを標準とし、生育状況に応じて調整してください。葉色が淡い場合や生育が遅い場合は、追加で5kg/10aを施用することも検討します。過剰な施肥は病害の発生を助長する可能性があるため、注意が必要です。',
      metadata: {
        guidebook: '新潟県葉茎菜類栽培指導書',
        section: '第2章 施肥管理',
        topic: '追肥',
      },
    },
    {
      source: '稲作技術指導.pdf',
      page: 45,
      confidence: 0.92,
      excerpt: 'コシヒカリの出穂期は平年で8月10日前後です。この時期の水管理が収量と品質に大きく影響します。',
      fullText: 'コシヒカリの出穂期は平年で8月10日前後です。この時期の水管理が収量と品質に大きく影響します。出穂前10日から出穂後20日までは湛水状態を維持し、水深3-5cmを保つことが推奨されます。この期間の水不足は登熟不良や白未熟粒の発生原因となるため、特に注意が必要です。また、高温期には朝夕の掛け流し灌水により水温を下げることで、高温障害を軽減できます。',
      metadata: {
        guidebook: '新潟県稲作技術指導書',
        section: '第5章 水管理',
        topic: '出穂期の水管理',
      },
    },
    {
      source: '有機栽培マニュアル.pdf',
      page: 33,
      confidence: 0.55,
      excerpt: '緑肥作物としてのヘアリーベッチは、窒素固定能力に優れています。',
      metadata: {
        guidebook: '新潟県有機栽培マニュアル',
        section: '第4章 緑肥利用',
        topic: '緑肥作物',
      },
    },
    {
      source: '病害虫防除指針.pdf',
      page: 67,
      confidence: 0.81,
      excerpt: 'いもち病の予防には、適切な栽培管理と予防的薬剤散布が重要です。特に葉いもちの初発を見逃さないことが肝要です。',
      fullText: 'いもち病の予防には、適切な栽培管理と予防的薬剤散布が重要です。特に葉いもちの初発を見逃さないことが肝要です。発生しやすい条件は、気温20-25°C、高湿度（相対湿度90%以上）、曇雨天が続く場合です。予防散布は出穂前20日、10日、穂揃期の3回を基本とし、発生が見られた場合は速やかに治療的薬剤を使用します。また、窒素過多は発生を助長するため、適正な施肥管理も予防の重要な要素です。',
      metadata: {
        guidebook: '新潟県病害虫防除指針',
        section: '第2章 主要病害',
        topic: 'いもち病',
      },
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Page Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            📚 Guidebook Evidence Card Test
          </h1>
          <p className="text-gray-600">
            Visual verification of guidebook citation styling with various confidence levels
          </p>
          <div className="mt-4 flex gap-2 text-sm">
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full">
              High: {'>'}80%
            </span>
            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full">
              Medium: 60-80%
            </span>
            <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full">
              Low: {'<'}60%
            </span>
          </div>
        </div>

        {/* Test Section 1: Individual Cards */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">
            Individual Evidence Cards
          </h2>
          <p className="text-gray-600">
            Testing individual card styling with different confidence levels
          </p>
          <div className="grid grid-cols-1 gap-4">
            {mockCitations.map((citation, idx) => (
              <GuidebookEvidenceCard
                key={idx}
                citation={citation}
              />
            ))}
          </div>
        </section>

        {/* Test Section 2: Evidence Rail (Full Component) */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">
            Evidence Rail Component
          </h2>
          <p className="text-gray-600">
            Testing the full evidence rail as it appears in the chat interface
          </p>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Mock chat area */}
            <div className="xl:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="space-y-4">
                <div className="bg-gray-100 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-2">ユーザー:</p>
                  <p className="text-gray-900">
                    今夜は霜が降りそうですか？キャベツの対策を教えてください。
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <p className="text-sm text-gray-600 mb-2">AI アシスタント:</p>
                  <p className="text-gray-900 mb-3">
                    はい、今夜は気温が5°C以下に下がる予報が出ています。
                    キャベツの霜対策として、以下の方法が効果的です：
                  </p>
                  <ul className="space-y-2 text-gray-900">
                    <li className="flex gap-2">
                      <span>1.</span>
                      <span>マルチングや不織布で被覆する</span>
                    </li>
                    <li className="flex gap-2">
                      <span>2.</span>
                      <span>前日の夕方までに実施する</span>
                    </li>
                    <li className="flex gap-2">
                      <span>3.</span>
                      <span>稲わらや黒マルチフィルムを使用する</span>
                    </li>
                  </ul>
                  <p className="text-sm text-gray-600 mt-3 italic">
                    詳しい情報は右側の「根拠となる資料」をご確認ください →
                  </p>
                </div>
              </div>
            </div>

            {/* Evidence rail */}
            <div className="xl:col-span-1">
              <GuidebookEvidenceRail citations={mockCitations} />
            </div>
          </div>
        </section>

        {/* Test Section 3: Empty State */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">
            Empty State
          </h2>
          <p className="text-gray-600">
            Testing the appearance when no citations are available
          </p>
          <div className="max-w-md">
            <GuidebookEvidenceRail citations={[]} />
          </div>
        </section>

        {/* Test Section 4: Single Citation */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">
            Single Citation (No Agreement Badge)
          </h2>
          <p className="text-gray-600">
            Testing with only one citation (should not show agreement badge)
          </p>
          <div className="max-w-md">
            <GuidebookEvidenceRail citations={[mockCitations[0]]} />
          </div>
        </section>

        {/* Test Section 5: Mobile Responsiveness */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">
            Mobile Responsiveness Test
          </h2>
          <p className="text-gray-600">
            Resize your browser window to test mobile/tablet views
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              💡 <strong>Testing Tips:</strong>
            </p>
            <ul className="text-sm text-blue-800 mt-2 space-y-1 ml-4">
              <li>• Desktop (≥1280px): Evidence rail appears on right side</li>
              <li>• Tablet/Mobile ({'<'}1280px): Evidence rail hidden on desktop layout</li>
              <li>• Touch-friendly buttons and adequate tap targets</li>
              <li>• Japanese text should render with Noto Sans JP font</li>
            </ul>
          </div>
        </section>

        {/* Navigation */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <p className="text-gray-600 mb-4">
            Testing complete? Return to the main chat interface:
          </p>
          <Link
            href="/ja/chat"
            className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            チャットに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
