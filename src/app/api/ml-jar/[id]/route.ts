import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });

    const { id } = await params;

    const jarEntry = await prisma.jarReason.findUnique({
      where: { id }
    });

    if (!jarEntry) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Jar entry not found' } }, { status: 404 });
    }

    if (jarEntry.creatorId !== userId) {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'You can only delete your own jar entries' } }, { status: 403 });
    }

    const couple = await prisma.couple.findFirst({
      where: { OR: [{ partnerAId: userId }, { partnerBId: userId }] }
    });

    if (!couple || couple.id !== jarEntry.coupleId) {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Invalid couple membership' } }, { status: 403 });
    }

    await prisma.jarReason.delete({
      where: { id }
    });

    return NextResponse.json(null, { status: 204 });

  } catch (error: any) {
    console.error('[JAR_DELETE]', error);
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, { status: 500 });
  }
}
