import { NextRequest, NextResponse } from 'next/server';
import { appendQueryParam, getWeatherBackendUrl, getWeatherProxyHeaders } from '../_shared';

export async function GET(request: NextRequest) {
  try {
    const backendUrl = getWeatherBackendUrl();
    const params = new URLSearchParams();

    appendQueryParam(params, 'lat', request.nextUrl.searchParams.get('lat'));
    appendQueryParam(params, 'lon', request.nextUrl.searchParams.get('lon'));
    appendQueryParam(params, 'fieldId', request.nextUrl.searchParams.get('fieldId'));
    appendQueryParam(params, 'projectId', request.nextUrl.searchParams.get('projectId'));

    const url = `${backendUrl}/api/v1/weather/alerts${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await fetch(url, {
      headers: await getWeatherProxyHeaders(request),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          location: '不明',
          alerts: [],
          sourceStatus: 'unavailable',
          sourceMessage: `alerts_upstream_${response.status}`,
          meta: {
            fetchedAt: new Date().toISOString(),
            validUntil: new Date().toISOString(),
            isStale: true,
            provider: 'weather-bff',
            providerModel: 'fallback',
            locationReason: 'regional_default',
            degradedReason: 'alerts_proxy_upstream_error',
          },
        },
        { status: 200 },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Weather alerts API proxy error:', error);
    return NextResponse.json(
      {
        location: '不明',
        alerts: [],
        sourceStatus: 'unavailable',
        sourceMessage: 'alerts_proxy_error',
        meta: {
          fetchedAt: new Date().toISOString(),
          validUntil: new Date().toISOString(),
          isStale: true,
          provider: 'weather-bff',
          providerModel: 'fallback',
          locationReason: 'regional_default',
          degradedReason: 'alerts_proxy_error',
        },
      },
      { status: 200 },
    );
  }
}
