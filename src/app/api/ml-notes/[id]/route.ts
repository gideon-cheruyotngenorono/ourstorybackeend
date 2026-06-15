import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });

    const { id } = await params;

    const note = await prisma.note.findUnique({
      where: { id },
      include: {
        creator: { select: { displayName: true } }
      }
    });

    if (!note || note.isArchived) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Note not found' } }, { status: 404 });
    }

    const couple = await prisma.couple.findFirst({
      where: { OR: [{ partnerAId: userId }, { partnerBId: userId }] }
    });

    if (!couple || couple.id !== note.coupleId) {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Invalid couple membership' } }, { status: 403 });
    }

    return NextResponse.json({ data: note }, { status: 200 });
  } catch (error: any) {
    console.error('[NOTE_GET]', error);
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { title, content } = body;

    const note = await prisma.note.findUnique({
      where: { id }
    });

    if (!note || note.isArchived) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Note not found' } }, { status: 404 });
    }

    const couple = await prisma.couple.findFirst({
      where: { OR: [{ partnerAId: userId }, { partnerBId: userId }] }
    });

    if (!couple || couple.id !== note.coupleId) {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'You can only edit notes for your own couple' } }, { status: 403 });
    }

    const updatedNote = await prisma.note.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
      }
    });

    return NextResponse.json({ data: updatedNote }, { status: 200 });
  } catch (error: any) {
    console.error('[NOTE_PATCH]', error);
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });

    const { id } = await params;

    const note = await prisma.note.findUnique({
      where: { id }
    });

    if (!note || note.isArchived) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Note not found' } }, { status: 404 });
    }

    const couple = await prisma.couple.findFirst({
      where: { OR: [{ partnerAId: userId }, { partnerBId: userId }] }
    });

    if (!couple || couple.id !== note.coupleId) {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'You can only delete notes for your own couple' } }, { status: 403 });
    }

    await prisma.note.update({
      where: { id },
      data: { isArchived: true }
    });

    return NextResponse.json({ message: 'Note deleted successfully' }, { status: 200 });
  } catch (error: any) {
    console.error('[NOTE_DELETE]', error);
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, { status: 500 });
  }
}
