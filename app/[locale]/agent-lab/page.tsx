import Link from 'next/link';
import { notFound } from 'next/navigation';
import { RouvisChatKit } from '@/components/RouvisChatKit';

export default function AgentLabPage() {
  if (process.env.NEXT_PUBLIC_ENABLE_AGENT_LAB !== 'true') {
    notFound();
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 space-y-4">
      <div className="bg-white rounded-xl border border-emerald-200 shadow-sm p-5">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-white font-semibold">
              AK
            </span>
            <div>
              <h1 className="text-xl font-bold text-gray-900">AgentKit Playground</h1>
              <p className="text-sm text-gray-600">Send real agent requests and inspect tool/citation events.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-700">
            <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3">
              <div className="font-semibold text-emerald-800 mb-1">Setup</div>
              <ul className="list-disc list-inside space-y-1 text-emerald-900">
                <li>Start backend API and set <code>AGENTKIT_ENABLED=true</code> (or <code>USE_AGENTS=true</code>)</li>
                <li>Point web to your API: <code>NEXT_PUBLIC_API_BASE_URL=http://localhost:4000</code></li>
              </ul>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="font-semibold text-gray-800 mb-1">Tips</div>
              <ul className="list-disc list-inside space-y-1">
                <li>Try: <span className="font-mono">水やり 20L をA圃場で</span></li>
                <li>Look for streamed <code>tool_call_delta</code>, <code>tool_call_result</code>, and citations in the UI.</li>
                <li>Backend contract: <code>POST /v1/agents/run</code> streaming SSE.</li>
              </ul>
            </div>
          </div>
          <div className="text-xs text-gray-500">
            Need the event format? See{' '}
            <Link href="/app/api/chatkit/route.ts" className="text-emerald-700 underline">
              /api/chatkit
            </Link>{' '}
            proxy for the expected SSE normalization.
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <RouvisChatKit className="h-[70vh]" />
      </div>
    </div>
  );
}
