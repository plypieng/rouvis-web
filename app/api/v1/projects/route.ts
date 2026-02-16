import { NextRequest } from 'next/server';
import { getBackendAuth } from '../../../../lib/backend-proxy-auth';
import {
    resolveBackendBaseUrl,
    resolveRequestId,
    toApiErrorResponse,
    toProxyJsonResponse,
} from '../../../../lib/api-contract';

const BACKEND_URL = resolveBackendBaseUrl();

export async function GET(req: NextRequest) {
    const requestId = resolveRequestId(req);
    const auth = await getBackendAuth(req);
    if (!auth.headers) {
        return toApiErrorResponse({
            status: 401,
            code: 'UNAUTHORIZED',
            message: 'Unauthorized',
            requestId,
        });
    }

    try {
        const res = await fetch(`${BACKEND_URL}/api/v1/projects`, {
            headers: {
                'Content-Type': 'application/json',
                ...auth.headers,
                'X-Request-Id': requestId,
            },
        });
        return toProxyJsonResponse(res, requestId);
    } catch (error) {
        console.error('Projects proxy GET error:', error);
        return toApiErrorResponse({
            status: 500,
            code: 'INTERNAL_ERROR',
            message: 'Failed to fetch projects',
            requestId,
        });
    }
}

export async function POST(req: NextRequest) {
    const requestId = resolveRequestId(req);
    const auth = await getBackendAuth(req);
    if (!auth.headers) {
        return toApiErrorResponse({
            status: 401,
            code: 'UNAUTHORIZED',
            message: 'Unauthorized',
            requestId,
        });
    }

    try {
        const body = await req.json();
        const idempotencyKey = req.headers.get('idempotency-key')
            || req.headers.get('x-idempotency-key');

        const res = await fetch(`${BACKEND_URL}/api/v1/projects`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...auth.headers,
                ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
                'X-Request-Id': requestId,
            },
            body: JSON.stringify(body),
        });

        return toProxyJsonResponse(res, requestId);
    } catch (error) {
        console.error('Projects proxy POST error:', error);
        return toApiErrorResponse({
            status: 500,
            code: 'INTERNAL_ERROR',
            message: 'Failed to create project',
            requestId,
        });
    }
}
