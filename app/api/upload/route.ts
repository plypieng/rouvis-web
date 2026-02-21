import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

// Optional: you can import your auth config if you want strictly authenticated uploads
// import { authOptions } from "@/lib/auth";

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
                // Generate a client token for the browser to upload the file
                // ⚠️ Authenticate and authorize users before generating the token.
                // Otherwise, you're allowing anonymous uploads.

                const session = await getServerSession();
                if (!session) {
                    throw new Error('Unauthorized');
                }

                return {
                    allowedContentTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
                    tokenPayload: JSON.stringify({
                        userId: session.user?.id,
                    }),
                };
            },
            onUploadCompleted: async ({ blob, tokenPayload }) => {
                // Get notified of client upload completion
                // ⚠️ This will not work on `localhost` websites,
                // Use ngrok or similar to get the full upload flow

                console.log('blob upload completed', blob, tokenPayload);

                try {
                    // Run any logic after the file has been uploaded
                    // const { userId } = JSON.parse(tokenPayload);
                    // await prisma.user.update({ where: { id: userId }, data: { avatar: blob.url } });
                } catch (error) {
                    throw new Error('Could not update user');
                }
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
