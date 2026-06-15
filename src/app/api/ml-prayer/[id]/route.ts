import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });

    const { id } = await params;

    const prayer = await prisma.prayer.findUnique({
      where: { id },
      include: {
        creator: { select: { displayName: true } }
      }
    });

    if (!prayer || prayer.isArchived) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Prayer not found' } }, { status: 404 });
    }

    const couple = await prisma.couple.findFirst({
      where: { OR: [{ partnerAId: userId }, { partnerBId: userId }] }
    });

    if (!couple || couple.id !== prayer.coupleId) {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Invalid couple membership' } }, { status: 403 });
    }

    // Mapping isAnswered as there is no answeredAt in the current schema
    return NextResponse.json({ 
      data: {
        ...prayer,
        answeredAt: prayer.isAnswered ? prayer.updatedAt : null
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error('[PRAYER_GET]', error);
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { content, category } = body;

    const prayer = await prisma.prayer.findUnique({
      where: { id }
    });

    if (!prayer || prayer.isArchived) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Prayer not found' } }, { status: 404 });
    }

    const couple = await prisma.couple.findFirst({
      where: { OR: [{ partnerAId: userId }, { partnerBId: userId }] }
    });

    if (!couple || couple.id !== prayer.coupleId) {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'You can only edit prayers for your own couple' } }, { status: 403 });
    }

    const updatedPrayer = await prisma.prayer.update({
      where: { id },
      data: {
        ...(content !== undefined && { content }),
        ...(category !== undefined && { category }),
      }
    });

    return NextResponse.json({ data: updatedPrayer }, { status: 200 });
  } catch (error: any) {
    console.error('[PRAYER_PATCH]', error);
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });

    const { id } = await params;

    const prayer = await prisma.prayer.findUnique({
      where: { id }
    });

    if (!prayer || prayer.isArchived) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Prayer not found' } }, { status: 404 });
    }

    const couple = await prisma.couple.findFirst({
      where: { OR: [{ partnerAId: userId }, { partnerBId: userId }] }
    });

    if (!couple || couple.id !== prayer.coupleId) {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'You can only delete prayers for your own couple' } }, { status: 403 });
    }

    await prisma.prayer.update({
      where: { id },
      data: { isArchived: true }
    });

    return NextResponse.json({ message: 'Prayer deleted successfully' }, { status: 200 });
  } catch (error: any) {
    console.error('[PRAYER_DELETE]', error);
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, { status: 500 });
  }
}
