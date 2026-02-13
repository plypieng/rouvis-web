import { NextRequest, NextResponse } from 'next/server';
import { appendQueryParam, getWeatherBackendUrl, getWeatherProxyHeaders } from './_shared';

type LegacyAlertSeverity = 'advisory' | 'warning' | 'emergency';

function toLegacySeverity(severity: string): LegacyAlertSeverity {
  if (severity === 'high') return 'emergency';
  if (severity === 'medium') return 'warning';
  return 'advisory';
}

function buildQueryFromRequest(request: NextRequest): URLSearchParams {
  const params = new URLSearchParams();
  appendQueryParam(params, 'lat', request.nextUrl.searchParams.get('lat'));
  appendQueryParam(params, 'lon', request.nextUrl.searchParams.get('lon'));
  appendQueryParam(params, 'fieldId', request.nextUrl.searchParams.get('fieldId'));
  appendQueryParam(params, 'projectId', request.nextUrl.searchParams.get('projectId'));
  return params;
}

async function proxyJson(request: NextRequest, upstreamPath: string, query: URLSearchParams) {
  const backendUrl = getWeatherBackendUrl();
  const url = `${backendUrl}${upstreamPath}${query.toString() ? `?${query.toString()}` : ''}`;

  const response = await fetch(url, {
    headers: await getWeatherProxyHeaders(request),
    signal: AbortSignal.timeout(10000),
  });

  const data = await response.json().catch(() => ({}));
  return { response, data };
}

function mapAlertsLegacy(data: any) {
  const alerts = Array.isArray(data?.alerts) ? data.alerts : [];
  const warnings = alerts.map((alert: any) => ({
    id: alert.id,
    type: alert.type,
    severity: toLegacySeverity(alert.severity),
    title: alert.title,
    description: alert.description,
    validFrom: alert.validFrom,
    validTo: alert.validTo,
  }));

  const typhoons = alerts
    .filter((alert: any) => alert.type === 'typhoon')
    .map((alert: any) => ({
      id: alert.id,
      name: alert.title,
      intensity: alert.severity,
      isApproaching: true,
    }));

  return {
    location: data?.location?.label || data?.location || '不明',
    warnings,
    typhoons,
    alerts,
    sourceStatus: data?.sourceStatus,
    sourceMessage: data?.sourceMessage,
    meta: data?.meta,
  };
}

function mapOverviewLegacy(data: any) {
  const daily = Array.isArray(data?.daily) ? data.daily : [];
  const alerts = Array.isArray(data?.alerts) ? data.alerts : [];

  const forecast = daily.map((day: any) => ({
    date: day.date,
    temperature: day.temperature,
    condition: day?.condition?.label || '不明',
    icon: day?.condition?.icon || '03d',
    precipitation: day?.precipitationMm ?? 0,
    windSpeed: day?.windSpeedKmh ?? 0,
    windDirection: day?.windDirectionLabel ?? '-',
  }));

  return {
    location: data?.location?.label || '不明',
    temperature: data?.current?.temperature ?? 0,
    humidity: 0,
    windSpeed: data?.current?.windSpeedKmh ?? 0,
    condition: data?.current?.condition?.label || '取得失敗',
    icon: data?.current?.condition?.icon || '03d',
    forecast,
    timestamp: data?.current?.observedAt,
    source: data?.meta ? `${data.meta.provider} (${data.meta.providerModel})` : 'weather-bff',
    warnings: alerts.map((alert: any) => ({
      id: alert.id,
      type: alert.type,
      severity: toLegacySeverity(alert.severity),
      title: alert.title,
      description: alert.description,
      validFrom: alert.validFrom,
      validTo: alert.validTo,
    })),
    typhoons: alerts
      .filter((alert: any) => alert.type === 'typhoon')
      .map((alert: any) => ({
        id: alert.id,
        name: alert.title,
        intensity: alert.severity,
        isApproaching: true,
      })),
    meta: data?.meta,
    schedulingRisks: data?.schedulingRisks || [],
    alertSourceStatus: data?.alertSourceStatus,
    alertSourceMessage: data?.alertSourceMessage,
  };
}

export async function GET(request: NextRequest) {
  try {
    const type = request.nextUrl.searchParams.get('type');
    const year = request.nextUrl.searchParams.get('year');
    const month = request.nextUrl.searchParams.get('month');

    if (type === 'monthly' || (year && month)) {
      const monthlyQuery = buildQueryFromRequest(request);
      appendQueryParam(monthlyQuery, 'year', year);
      appendQueryParam(monthlyQuery, 'month', month);

      const { response, data } = await proxyJson(request, '/api/v1/weather/forecast/monthly', monthlyQuery);
      if (!response.ok) {
        return NextResponse.json(
          { error: `Upstream error ${response.status}`, details: data },
          { status: response.status },
        );
      }

      return NextResponse.json(data);
    }

    if (type?.includes('warning') || type?.includes('typhoon')) {
      const { response, data } = await proxyJson(request, '/api/v1/weather/alerts', buildQueryFromRequest(request));

      if (!response.ok) {
        return NextResponse.json(mapAlertsLegacy({ alerts: [], sourceStatus: 'unavailable', sourceMessage: `upstream_${response.status}` }));
      }

      return NextResponse.json(mapAlertsLegacy(data));
    }

    const { response, data } = await proxyJson(request, '/api/v1/weather/overview', buildQueryFromRequest(request));
    if (!response.ok) {
      return NextResponse.json(
        { error: `Upstream error ${response.status}`, details: data },
        { status: response.status },
      );
    }

    return NextResponse.json(mapOverviewLegacy(data));
  } catch (error) {
    console.error('Weather API proxy error:', error);
    return NextResponse.json({ error: 'Failed to fetch weather' }, { status: 500 });
  }
}
