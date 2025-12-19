import Link from 'next/link';
import { AdvisorStrip } from './AdvisorStrip';
import PriorityTaskBubble from './PriorityTaskBubble';
import DashboardCalendar from './DashboardCalendar';

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

  return (
    <div className="bg-card border-b border-border mb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col">

          {/* 1. Large Weekly Calendar with Priority Bubble */}
          <div className="flex items-stretch gap-0 z-10">
            {/* Left: Priority Bubble (Fixed width) */}
            <PriorityTaskBubble task={priorityTask} />

            {/* Right: Calendar (Takes remaining space) */}
            <div className="flex-1 min-w-0">
              <DashboardCalendar tasks={tasks} locale={locale} weatherForecast={weather.forecast} />
            </div>
          </div>

          {/* 2. AI Advisor Strip (Moved Below Calendar) */}
          <div className="w-full -mt-[2px] z-0">
            <AdvisorStrip className="rounded-t-none" />
          </div>

        </div>
      </div>
    </div>
  );
}
