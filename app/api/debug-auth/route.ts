import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const nextAuthUrl = process.env.NEXTAUTH_URL;

    const mask = (str?: string) => {
        if (!str) return 'UNDEFINED';
        if (str.length < 10) return str.substring(0, 2) + '***';
        return str.substring(0, 5) + '...' + str.substring(str.length - 5);
    };

    return NextResponse.json({
        googleClientId: mask(clientId),
        googleClientSecret: mask(clientSecret),
        nextAuthUrl: nextAuthUrl,
        envCheck: {
            hasClientId: !!clientId,
            hasClientSecret: !!clientSecret,
            clientIdLength: clientId?.length || 0,
        }
    });
}
