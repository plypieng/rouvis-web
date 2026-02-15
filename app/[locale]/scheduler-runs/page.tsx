import { SchedulerRunLifecyclePanel } from '@/components/SchedulerRunLifecyclePanel';

export default function SchedulerRunsPage() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-4 px-4 py-6">
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h1 className="text-xl font-semibold text-gray-900">Scheduler Async Run Lifecycle</h1>
        <p className="mt-1 text-sm text-gray-600">
          Queue scheduler runs, poll lifecycle states, trigger retries, and review scheduler/auth SLO health.
        </p>
      </div>
      <SchedulerRunLifecyclePanel />
    </div>
  );
}
