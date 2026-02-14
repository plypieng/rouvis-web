import { NextResponse } from 'next/server';

const migrationMessage = 'Legacy weather multiplexer has been removed. Use /api/weather/overview, /api/weather/forecast/daily, /api/weather/forecast/monthly, /api/weather/alerts, or /api/weather/risks/scheduling.';

export async function GET() {
  return NextResponse.json(
    {
      error: 'LEGACY_WEATHER_ROUTE_REMOVED',
      message: migrationMessage,
      migration: {
        overview: '/api/weather/overview',
        dailyForecast: '/api/weather/forecast/daily',
        monthlyForecast: '/api/weather/forecast/monthly',
        alerts: '/api/weather/alerts',
        schedulingRisks: '/api/weather/risks/scheduling',
      },
    },
    { status: 410 },
  );
}
