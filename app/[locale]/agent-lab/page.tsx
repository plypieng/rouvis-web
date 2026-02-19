import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { RouvisChatKit } from '@/components/RouvisChatKit';

export default async function AgentLabPage() {
  if (process.env.NEXT_PUBLIC_ENABLE_AGENT_LAB !== 'true') {
    notFound();
  }
  const t = await getTranslations('pages.agent_lab');

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 space-y-4">
      <div className="bg-white rounded-xl border border-emerald-200 shadow-sm p-5">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-white font-semibold">
              AK
            </span>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{t('title')}</h1>
              <p className="text-sm text-gray-600">{t('subtitle')}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-700">
            <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3">
              <div className="font-semibold text-emerald-800 mb-1">{t('setup_title')}</div>
              <ul className="list-disc list-inside space-y-1 text-emerald-900">
                <li>{t('setup_step_backend')}</li>
                <li>{t('setup_step_api')}</li>
              </ul>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="font-semibold text-gray-800 mb-1">{t('tips_title')}</div>
              <ul className="list-disc list-inside space-y-1">
                <li>{t('tip_try')}</li>
                <li>{t('tip_stream')}</li>
                <li>{t('tip_contract')}</li>
              </ul>
            </div>
          </div>
          <div className="text-xs text-gray-500">
            {t('event_format_help')}{' '}
            <Link href="/app/api/chatkit/route.ts" className="text-emerald-700 underline">
              {t('proxy_link_label')}
            </Link>{' '}
            {t('event_format_suffix')}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <RouvisChatKit className="h-[70vh]" />
      </div>
    </div>
  );
}
