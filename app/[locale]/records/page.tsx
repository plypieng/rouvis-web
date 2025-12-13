'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ActivityDashboard } from '../../../components/ActivityDashboard';
import { ActivityLogModal } from '../../../components/ActivityLogModal';
import { TaskSchedulerModal } from '../../../components/TaskSchedulerModal';

export default function RecordsPage() {
  const params = useParams<{ locale: string }>();
  const locale = (params?.locale as string) || 'ja';
  const router = useRouter();
  const [showLogModal, setShowLogModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">記録・分析</h1>

      <ActivityDashboard
        onLogActivity={() => setShowLogModal(true)}
        onScheduleTask={() => setShowTaskModal(true)}
        onViewCalendar={() => router.push(`/${locale}/calendar`)}
      />

      <ActivityLogModal
        isOpen={showLogModal}
        onClose={() => setShowLogModal(false)}
        onSave={async (activity) => {
          const res = await fetch('/api/v1/activities', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: activity.type,
              qty: activity.quantity,
              unit: activity.unit,
              note: activity.note,
              performedAt: activity.performedAt ? new Date(activity.performedAt).toISOString() : undefined,
              fieldId: activity.fieldId,
            }),
          });

          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || 'Failed to log activity');
          }

          router.refresh();
        }}
      />

      <TaskSchedulerModal
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        onSave={async (task) => {
          const res = await fetch('/api/v1/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: task.title,
              description: task.notes,
              dueAt: new Date(task.dueAt).toISOString(),
              fieldId: task.fieldId,
            }),
          });

          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || 'Failed to create task');
          }

          router.refresh();
        }}
      />
    </div>
  );
}
