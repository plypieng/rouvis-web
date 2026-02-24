import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { CHAT_IMAGE_ALLOWED_CONTENT_TYPES, CHAT_IMAGE_MAX_BYTES } from '@/lib/chat-image-upload';

export async function POST(request: Request): Promise<NextResponse> {
    const body = (await request.json()) as HandleUploadBody;

    try {
        const jsonResponse = await handleUpload({
            body,
            request,
            onBeforeGenerateToken: async (
                pathname: string,
                /* clientPayload?: string, */
            ) => {
                const session = await getServerSession(authOptions);
                const userId = typeof session?.user?.id === 'string' ? session.user.id.trim() : '';
                if (!userId) {
                    throw new Error('Unauthorized');
                }

                const expectedPrefix = `chat/${userId}/`;
                if (!pathname.startsWith(expectedPrefix)) {
                    throw new Error('Invalid upload path');
                }

                return {
                    allowedContentTypes: [...CHAT_IMAGE_ALLOWED_CONTENT_TYPES],
                    maximumSizeInBytes: CHAT_IMAGE_MAX_BYTES,
                    addRandomSuffix: false,
                    tokenPayload: JSON.stringify({
                        userId,
                        scope: 'chat',
                    }),
                };
            },
            onUploadCompleted: async ({ blob, tokenPayload }) => {
                console.log('chat image blob upload completed', {
                    pathname: blob.pathname,
                    tokenPayload,
                });
            },
        });

        return NextResponse.json(jsonResponse);
    } catch (error) {
        return NextResponse.json(
            { error: (error as Error).message },
            { status: 400 }, // The webhook will retry 5 times waiting for a 200
        );
    }
}
