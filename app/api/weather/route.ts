import { NextRequest, NextResponse } from 'next/server';

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
 * Returns an error if backend is unavailable.
 *
 * Backend endpoint: GET /api/v1/weather/forecast?lat=37.4&lon=138.9
 */
export async function GET(request: NextRequest) {
  try {
    const backendUrl = process.env.BACKEND_URL
      || process.env.NEXT_PUBLIC_API_BASE_URL
      || (process.env.NODE_ENV === 'production'
        ? 'https://localfarm-backend.vercel.app'
        : 'http://localhost:4000');

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
      const text = await response.text();
      return NextResponse.json(
        { error: `Upstream error ${response.status}`, details: text },
        { status: response.status },
      );
    }

    const data: WeatherData = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Weather API proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch weather' },
      { status: 500 },
    );
  }
}
