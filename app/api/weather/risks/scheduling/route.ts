import { NextRequest, NextResponse } from 'next/server';
import { appendQueryParam, getWeatherBackendUrl, getWeatherProxyHeaders } from '../../_shared';

export async function GET(request: NextRequest) {
  try {
    const backendUrl = getWeatherBackendUrl();
    const params = new URLSearchParams();

    appendQueryParam(params, 'lat', request.nextUrl.searchParams.get('lat'));
    appendQueryParam(params, 'lon', request.nextUrl.searchParams.get('lon'));
    appendQueryParam(params, 'fieldId', request.nextUrl.searchParams.get('fieldId'));
    appendQueryParam(params, 'projectId', request.nextUrl.searchParams.get('projectId'));
    appendQueryParam(params, 'days', request.nextUrl.searchParams.get('days'));

    const response = await fetch(
      `${backendUrl}/api/v1/weather/risks/scheduling${params.toString() ? `?${params.toString()}` : ''}`,
      {
        headers: await getWeatherProxyHeaders(request),
        signal: AbortSignal.timeout(10000),
      },
    );

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { error: `Upstream error ${response.status}`, details: text },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Weather scheduling risks API proxy error:', error);
    return NextResponse.json({ error: 'Failed to fetch weather scheduling risks' }, { status: 500 });
  }
}
