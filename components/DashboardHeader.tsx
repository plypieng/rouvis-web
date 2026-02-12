import { AdvisorStrip } from './AdvisorStrip';
import PriorityTaskBubble from './PriorityTaskBubble';
import DashboardCalendar from './DashboardCalendar';
import { SeasonRail } from '@/components/workflow/SeasonRail';
import { buildSeasonRailState } from '@/lib/workflow-ui';
import type { RiskTone } from '@/types/ui-shell';

interface WeatherData {
  location: string;
  temperature: { max: number; min: number };
  condition: string;
  alerts?: string[];
  forecast?: any[];
}

interface Task {
  id: string;
  title: string;
  dueAt: string;
  status: string;
  projectName?: string;
  priority?: string;
}

export default async function DashboardHeader({ locale, weather, tasks }: { locale: string; weather: WeatherData; tasks: Task[] }) {
  const lowLabel = locale === 'ja' ? '最低' : 'Low';
  const highLabel = locale === 'ja' ? '最高' : 'High';

  // Find today's priority task
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  let priorityTask = tasks.find(t => {
    const taskDate = new Date(t.dueAt).toISOString().split('T')[0];
    return taskDate === todayStr && t.status !== 'completed';
  });

  // TODO: Remove this mock when real priority logic is fully connected
  // For UI verification as requested by user
  if (!priorityTask) {
    priorityTask = {
      id: 'mock-1',
      title: '冬期荒起し',
      dueAt: new Date().toISOString(),
      status: 'pending',
      projectName: 'メイン圃場',
      priority: 'high'
    };
  }

  const todayIso = new Date().toISOString().split('T')[0];
  const overdueCount = tasks.filter((task) => task.status !== 'completed' && task.dueAt.split('T')[0] < todayIso).length;
  const dueSoonCount = tasks.filter((task) => task.status !== 'completed' && task.dueAt.split('T')[0] === todayIso).length;

  let riskTone: RiskTone = 'safe';
  if ((weather.alerts?.length || 0) >= 2 || overdueCount > 3) riskTone = 'critical';
  else if ((weather.alerts?.length || 0) >= 1 || overdueCount > 0) riskTone = 'warning';
  else if (dueSoonCount > 3) riskTone = 'watch';

  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const completedTodayRatio = Math.round(((tasks.length - dueSoonCount) / Math.max(tasks.length, 1)) * 100);
  const seasonState = buildSeasonRailState({
    stage: overdueCount > 0 ? 'flowering' : 'vegetative',
    progress: completedTodayRatio,
    dayCount: dayOfYear,
    totalDays: 365,
    windowLabel: `${weather.location} · ${highLabel} ${Math.round(weather.temperature.max)}° / ${lowLabel} ${Math.round(weather.temperature.min)}°`,
    risk: riskTone,
    note: overdueCount > 0
      ? `${overdueCount} ${locale === 'ja' ? '件の期限超過タスクがあります' : 'overdue tasks need recovery'}`
      : locale === 'ja'
        ? '今日の重点タスクを先に完了させると遅延を防げます'
        : 'Clear priority items early to keep this week on track.',
  });

  return (
    <section className="surface-raised mb-8 overflow-hidden">
      <div className="shell-main py-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {locale === 'ja' ? '圃場オペレーション' : 'Field Operations'}
            </p>
            <h2 className="text-xl font-semibold text-foreground">
              {weather.location}
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-border bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
              {highLabel} {Math.round(weather.temperature.max)}°
            </span>
            <span className="rounded-full border border-border bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
              {lowLabel} {Math.round(weather.temperature.min)}°
            </span>
            {(weather.alerts?.length || 0) > 0 && (
              <span className="status-warning rounded-full px-3 py-1 text-xs font-semibold">
                {locale === 'ja' ? `警戒 ${weather.alerts?.length} 件` : `${weather.alerts?.length} alerts`}
              </span>
            )}
          </div>
        </div>

        <SeasonRail state={seasonState} className="mb-4" />

        <div className="mb-4 grid gap-4 lg:grid-cols-[320px,1fr]">
          <PriorityTaskBubble task={priorityTask} />
          <div className="surface-base min-w-0 overflow-hidden">
            <DashboardCalendar tasks={tasks} locale={locale} weatherForecast={weather.forecast} />
          </div>
        </div>

        <AdvisorStrip className="surface-base" />
      </div>
    </section>
  );
}
