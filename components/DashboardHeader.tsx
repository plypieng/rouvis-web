import { getTranslations } from 'next-intl/server';
import { AdvisorStrip } from './AdvisorStrip';

interface WeatherData {
  location: string;
  temperature: { max: number; min: number };
  condition: string;
  alerts?: string[];
}

export default async function DashboardHeader({ locale, weather }: { locale: string; weather: WeatherData }) {
  const t = await getTranslations({ locale, namespace: 'dashboard' });

  return (
    <div className="bg-card border-b border-border mb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Weather Widget - Simplified */}
          <div className="bg-secondary rounded-xl p-4 border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{weather.location}</p>
                <p className="text-2xl font-semibold text-foreground mt-1">
                  {weather.temperature.max}°C
                </p>
                <p className="text-sm text-muted-foreground">
                  {weather.condition} · 最低 {weather.temperature.min}°C
                </p>
              </div>
              {weather.alerts && weather.alerts.length > 0 && (
                <span className="text-warning text-sm font-medium">
                  ⚠ {weather.alerts[0]}
                </span>
              )}
            </div>
          </div>

          {/* AI Advisor Strip */}
          <div className="md:col-span-2">
            <AdvisorStrip />
          </div>

        </div>
      </div>
    </div>
  );
}
