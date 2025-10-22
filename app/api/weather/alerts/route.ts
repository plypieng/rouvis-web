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
    // Get backend URL from environment (defaults to localhost for development)
    const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

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
      return NextResponse.json(getMockAlerts());
    }

    const data: AlertsResponse = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Weather alerts API proxy error:', error);

    // Return empty alerts array on error
    // This ensures the UI doesn't crash
    return NextResponse.json(getMockAlerts());
  }
}

/**
 * Mock alerts for development/fallback
 * Returns realistic Niigata-region alerts when backend is unavailable
 */
function getMockAlerts(): AlertsResponse {
  // For now, return empty alerts
  // In development, we can uncomment sample alerts for testing
  const alerts: WeatherAlert[] = [];

  // Sample frost alert (uncomment for testing)
  /*
  const isFrostSeason = new Date().getMonth() >= 9 || new Date().getMonth() <= 3;
  if (isFrostSeason) {
    alerts.push({
      type: 'frost',
      severity: 'high',
      message: '今夜2°Cまで冷え込み、霜の可能性',
      location: '長岡市',
      actionRequired: 'コシヒカリの苗を保護してください',
      validFrom: new Date().toISOString(),
      validTo: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
  }
  */

  return {
    alerts,
    timestamp: new Date().toISOString(),
  };
}
