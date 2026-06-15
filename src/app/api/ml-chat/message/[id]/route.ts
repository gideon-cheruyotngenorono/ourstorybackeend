import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });

    const { id } = await params;

    const message = await prisma.message.findUnique({
      where: { id },
      include: {
        sender: {
          select: { displayName: true, avatarUrl: true }
        },
        reactions: true,
        replies: {
          include: {
            sender: { select: { displayName: true, avatarUrl: true } }
          }
        }
      }
    });

    if (!message) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Message not found' } }, { status: 404 });
    }

    return NextResponse.json({ data: message }, { status: 200 });
  } catch (error: any) {
    console.error('[MESSAGE_GET]', error);
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { content } = body;

    if (!content) {
      return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'Content is required' } }, { status: 400 });
    }

    const message = await prisma.message.findUnique({
      where: { id }
    });

    if (!message) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Message not found' } }, { status: 404 });
    }

    if (message.senderId !== userId) {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'You can only edit your own messages' } }, { status: 403 });
    }

    // Check if within 5 minutes (5 * 60 * 1000 ms)
    const now = new Date().getTime();
    const messageTime = new Date(message.createdAt).getTime();
    if (now - messageTime > 5 * 60 * 1000) {
      return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'Edit time expired (>5 minutes)' } }, { status: 400 });
    }

    const updatedMessage = await prisma.message.update({
      where: { id },
      data: { content, isEdited: true }
    });

    return NextResponse.json({ data: updatedMessage }, { status: 200 });

  } catch (error: any) {
    console.error('[MESSAGE_PATCH]', error);
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });

    const { id } = await params;

    const message = await prisma.message.findUnique({
      where: { id }
    });

    if (!message) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Message not found' } }, { status: 404 });
    }

    if (message.senderId !== userId) {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'You can only delete your own messages' } }, { status: 403 });
    }

    // Soft delete logic since we use isDeleted boolean
    const updatedMessage = await prisma.message.update({
      where: { id },
      data: { isDeleted: true, content: 'This message was deleted' }
    });

    return NextResponse.json({ data: updatedMessage }, { status: 200 });

  } catch (error: any) {
    console.error('[MESSAGE_DELETE]', error);
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, { status: 500 });
  }
}
