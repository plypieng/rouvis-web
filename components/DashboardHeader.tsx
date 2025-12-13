import Link from 'next/link';
import { AdvisorStrip } from './AdvisorStrip';

interface WeatherData {
  location: string;
  temperature: { max: number; min: number };
  condition: string;
  alerts?: string[];
}

export default async function DashboardHeader({ locale, weather }: { locale: string; weather: WeatherData }) {
  const lowLabel = locale === 'ja' ? '最低' : 'Low';
  const highLabel = locale === 'ja' ? '最高' : 'High';
  const calendarTitle = locale === 'ja' ? 'カレンダー' : 'Calendar';
  const calendarSubtitle = locale === 'ja' ? '今週の予定を確認する' : 'View your weekly schedule';
  return (
    <div className="bg-card border-b border-border mb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Calendar (top priority for user testing) */}
          <Link
            href={`/${locale}/calendar`}
            className="bg-secondary rounded-xl p-4 border border-border hover:bg-secondary/80 transition-colors"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">{calendarTitle}</p>
                <p className="text-xl font-semibold text-foreground mt-1">
                  {calendarSubtitle}
                </p>
                <p className="text-sm text-muted-foreground mt-1 truncate">
                  {weather.location} · {weather.condition} · {highLabel} {weather.temperature.max}°C / {lowLabel} {weather.temperature.min}°C
                </p>
              </div>
              <div className="text-2xl" aria-hidden="true">📅</div>
            </div>
            {weather.alerts && weather.alerts.length > 0 && (
              <div className="mt-3 rounded-lg bg-warning/10 text-warning px-3 py-2 text-sm font-medium">
                ⚠ {weather.alerts[0]}
              </div>
            )}
          </Link>

          {/* AI Advisor Strip */}
          <div className="md:col-span-2">
            <AdvisorStrip />
          </div>

        </div>
      </div>
    </div>
  );
}
