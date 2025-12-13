import { NextRequest, NextResponse } from 'next/server';

// Weather alert types
type AlertType = 'frost' | 'typhoon' | 'heavy_rain' | 'strong_wind' | 'snow';
type AlertSeverity = 'high' | 'medium' | 'low';

interface WeatherAlert {
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  location: string;
  actionRequired?: string;
  validFrom?: string;
  validTo?: string;
}

interface AlertsResponse {
  alerts: WeatherAlert[];
  timestamp: string;
}

/**
 * Weather Alerts Proxy
 *
 * Proxies requests to backend weather alerts API for Niigata region.
 * Returns JMA (Japan Meteorological Agency) alerts.
 *
 * Backend endpoint: GET /api/v1/weather/alerts?area=niigata
 */
export async function GET(request: NextRequest) {
  try {
    const backendUrl = process.env.BACKEND_URL
      || process.env.NEXT_PUBLIC_API_BASE_URL
      || (process.env.NODE_ENV === 'production'
        ? 'https://localfarm-backend.vercel.app'
        : 'http://localhost:4000');

    // Get area from query params (defaults to Niigata)
    const area = request.nextUrl.searchParams.get('area') || 'niigata';

    // Call new backend endpoint
    const url = `${backendUrl}/api/v1/weather/alerts?area=${area}`;

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
      // Add timeout to prevent hanging
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      console.warn(`Backend weather alerts API returned ${response.status}, falling back to empty alerts`);
      return NextResponse.json(emptyAlerts());
    }

    const data: AlertsResponse = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Weather alerts API proxy error:', error);

    // Return empty alerts array on error
    // This ensures the UI doesn't crash
    return NextResponse.json(emptyAlerts());
  }
}

/**
 * Empty alerts fallback
 */
function emptyAlerts(): AlertsResponse {
  const alerts: WeatherAlert[] = [];

  return {
    alerts,
    timestamp: new Date().toISOString(),
  };
}
