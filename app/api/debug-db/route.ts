import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    const userId = 'cmje2zhx0000c83k415zvybo3'; // plysd4@gmail.com
    const results: Record<string, any> = {};

    // Try with only safe columns (no uiMode which doesn't exist in DB)
    try {
        const userProfile = await prisma.userProfile.findUnique({
            where: { userId },
            select: { id: true, experienceLevel: true },
        });
        results.userProfileSafe = userProfile || 'NOT FOUND';
    } catch (e: any) {
        results.userProfileSafe = { error: e.message?.substring(0, 500) };
    }

    // Check fields  
    try {
        const fields = await prisma.field.findMany({
            where: { userId },
            select: { id: true, name: true },
            take: 5,
        });
        results.fields = fields.length > 0 ? fields : 'NONE';
    } catch (e: any) {
        results.fields = { error: e.message?.substring(0, 300) };
    }

    // Check projects
    try {
        const projects = await prisma.project.findMany({
            where: { userId },
            select: { id: true, name: true },
            take: 5,
        });
        results.projects = projects.length > 0 ? projects : 'NONE';
    } catch (e: any) {
        results.projects = { error: e.message?.substring(0, 300) };
    }

    return NextResponse.json(results);
}
