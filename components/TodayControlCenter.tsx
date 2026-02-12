'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toastError, toastSuccess } from '@/lib/feedback';

type QuickTask = {
  id: string;
  title: string;
  projectName?: string;
};

function buildTodayChatHref(locale: string): string {
  const query = new URLSearchParams({
    intent: 'today',
    prompt: '今日やるべき作業を優先順位つきで3つに整理して',
    fresh: '1',
  });
  return `/${locale}/chat?${query.toString()}`;
}

export default function TodayControlCenter({
  locale,
  quickTask,
}: {
  locale: string;
  quickTask?: QuickTask | null;
}) {
  const router = useRouter();
  const [completing, setCompleting] = useState(false);

  const handleQuickComplete = async () => {
    if (!quickTask?.id || completing) return;
    setCompleting(true);

    try {
      const res = await fetch(`/api/v1/tasks/${quickTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || 'タスク更新に失敗しました');
      }

      toastSuccess(`「${quickTask.title}」を完了にしました。`);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'タスク更新に失敗しました';
      toastError(message, {
        label: '再試行',
        onClick: () => {
          void handleQuickComplete();
        },
      });
    } finally {
      setCompleting(false);
    }
  };

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-base font-bold text-gray-900">Today Control Center</h2>
        <span className="text-xs text-gray-500">1タップ操作</span>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Link
          href={`/${locale}/records?action=log`}
          className="flex min-h-[52px] items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
        >
          活動を記録
        </Link>

        <button
          type="button"
          onClick={() => {
            void handleQuickComplete();
          }}
          disabled={!quickTask || completing}
          className="flex min-h-[52px] items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {completing
            ? '更新中...'
            : quickTask
              ? '1件完了にする'
              : '完了対象なし'}
        </button>

        <Link
          href={buildTodayChatHref(locale)}
          data-testid="today-control-chat-link"
          className="flex min-h-[52px] items-center justify-center rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100"
        >
          AIに相談
        </Link>
      </div>

      {quickTask && (
        <p className="mt-3 text-xs text-gray-600">
          次の対象: {quickTask.title}
          {quickTask.projectName ? `（${quickTask.projectName}）` : ''}
        </p>
      )}
    </section>
  );
}
