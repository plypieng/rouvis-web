import { NextRequest, NextResponse } from 'next/server';
import { getDemoWeatherResponse, isDemoModeEnabled } from '@/lib/demo-scenario';

// Weather forecast response types
interface WeatherForecast {
  date: string;
  temperature: {
    min: number;
    max: number;
  };
  condition: string;
  icon: string;
  precipitation: number;
}

interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  condition: string;
  icon: string;
  forecast: WeatherForecast[];
  timestamp?: string;
}

/**
 * Weather Forecast Proxy
 *
 * Proxies requests to backend weather API with Niigata region coordinates.
 * Falls back to mock data if backend is unavailable.
 *
 * Backend endpoint: GET /api/v1/weather/forecast?lat=37.4&lon=138.9
 */
export async function GET(request: NextRequest) {
  try {
    if (isDemoModeEnabled()) {
      return NextResponse.json(getDemoWeatherResponse());
    }

    // Get backend URL from environment (defaults to localhost for development)
    const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

    // Niigata region coordinates (Nagaoka city: 37.4°N, 138.9°E)
    const lat = request.nextUrl.searchParams.get('lat') || '37.4';
    const lon = request.nextUrl.searchParams.get('lon') || '138.9';

    // Call new backend endpoint
    const url = `${backendUrl}/api/v1/weather/forecast?lat=${lat}&lon=${lon}`;

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
      // Add timeout to prevent hanging
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      console.warn(`Backend weather API returned ${response.status}, falling back to mock data`);
      return NextResponse.json(getMockWeatherData());
    }

    const data: WeatherData = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Weather API proxy error:', error);

    // Return fallback mock data instead of error
    // This ensures the UI always has something to display
    return NextResponse.json(isDemoModeEnabled() ? getDemoWeatherResponse() : getMockWeatherData());
  }
}

/**
 * Fallback mock weather data for Niigata region
 * Used when backend is unavailable or returns an error
 */
function getMockWeatherData(): WeatherData {
  const today = new Date();

  // Generate 5-day forecast
  const forecast: WeatherForecast[] = [];
  const conditions = [
    { condition: '晴れ', icon: '01d', precipitation: 0 },
    { condition: '晴れ時々曇り', icon: '02d', precipitation: 10 },
    { condition: '雨', icon: '10d', precipitation: 60 },
    { condition: '曇り', icon: '03d', precipitation: 20 },
    { condition: '晴れ', icon: '01d', precipitation: 5 },
  ];

  for (let i = 0; i < 5; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);

    forecast.push({
      date: date.toISOString().split('T')[0],
      temperature: {
        min: 15 + Math.floor(Math.random() * 3),
        max: 22 + Math.floor(Math.random() * 4),
      },
      condition: conditions[i].condition,
      icon: conditions[i].icon,
      precipitation: conditions[i].precipitation,
    });
  }

  return {
    temperature: 20,
    humidity: 65,
    windSpeed: 8,
    condition: '晴れ時々曇り',
    icon: '02d',
    forecast,
    timestamp: new Date().toISOString(),
  };
}
