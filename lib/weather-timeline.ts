export const WEATHER_RAIN_RISK_THRESHOLD = 60;
export const WEATHER_WATCH_RISK_THRESHOLD = 35;

export type WeatherDayRisk = 'dry' | 'watch' | 'rainy' | 'unknown';

export interface WeatherTimelineDayData {
  precipProbability: number;
  condition: string;
  weatherCode?: number;
  icon?: string;
  temperature?: {
    min: number;
    max: number;
  };
}

const WEATHER_SENSITIVE_KEYWORDS = [
  /spray/i,
  /spraying/i,
  /fungicide/i,
  /pesticide/i,
  /herbicide/i,
  /散布/,
  /殺菌剤/,
  /農薬/,
  /防除/,
];

export function clampPrecipProbability(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

export function precipitationMmToProbability(precipitationMm: number): number {
  if (!Number.isFinite(precipitationMm) || precipitationMm <= 0) return 5;
  if (precipitationMm <= 1) return 20;
  if (precipitationMm <= 3) return 40;
  if (precipitationMm <= 8) return 65;
  if (precipitationMm <= 15) return 82;
  return 92;
}

export function getWeatherDayRisk(day?: WeatherTimelineDayData): WeatherDayRisk {
  if (!day) return 'unknown';
  if (day.precipProbability >= WEATHER_RAIN_RISK_THRESHOLD) return 'rainy';
  if (day.precipProbability >= WEATHER_WATCH_RISK_THRESHOLD) return 'watch';
  return 'dry';
}

export function isRainRiskDay(day?: WeatherTimelineDayData): boolean {
  return getWeatherDayRisk(day) === 'rainy';
}

export function weatherIconForDay(day?: WeatherTimelineDayData): string {
  if (!day) return 'cloud';

  const code = day.weatherCode;
  if (typeof code === 'number') {
    if ([95, 96, 99].includes(code)) return 'thunderstorm';
    if ([71, 73, 75, 77, 85, 86].includes(code)) return 'weather_snowy';
    if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'rainy';
    if ([1, 2].includes(code)) return 'partly_cloudy_day';
    if (code === 0) return 'wb_sunny';
  }

  const condition = day.condition.toLowerCase();
  if (condition.includes('rain') || condition.includes('雨')) return 'rainy';
  if (condition.includes('storm') || condition.includes('雷')) return 'thunderstorm';
  if (condition.includes('snow') || condition.includes('雪')) return 'weather_snowy';
  if (condition.includes('sun') || condition.includes('晴')) return 'wb_sunny';
  if (condition.includes('cloud') || condition.includes('曇')) return 'cloud';

  if (day.precipProbability >= WEATHER_RAIN_RISK_THRESHOLD) return 'rainy';
  if (day.precipProbability <= 15) return 'wb_sunny';
  return 'cloud';
}

export function isWeatherSensitiveTask(task: {
  title?: string | null;
  description?: string | null;
}): boolean {
  const title = `${task.title || ''} ${task.description || ''}`.trim();
  if (!title) return false;
  return WEATHER_SENSITIVE_KEYWORDS.some((keyword) => keyword.test(title));
}
