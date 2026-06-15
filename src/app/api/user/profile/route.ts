import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { formatUserWithAvatar } from '@/services/avatar';

export async function GET(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        displayName: true,
        email: true,
        avatarUrl: true,
        createdAt: true,
      }
    });

    if (!user) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'User not found' } }, { status: 404 });
    }

    return NextResponse.json(formatUserWithAvatar(user), { status: 200 });
  } catch (error: any) {
    console.error('[USER_PROFILE_GET]', error);
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });
    }

    const body = await req.json();
    const { displayName, avatarUrl } = body;

    const dataToUpdate: any = {};
    if (displayName !== undefined) {
      if (!displayName || typeof displayName !== 'string') {
        return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'Invalid or missing displayName' } }, { status: 400 });
      }
      dataToUpdate.displayName = displayName;
    }

    if (avatarUrl !== undefined) {
      dataToUpdate.avatarUrl = avatarUrl;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
      select: {
        id: true,
        displayName: true,
        email: true,
        avatarUrl: true,
        createdAt: true,
      }
    });

    return NextResponse.json(formatUserWithAvatar(updatedUser), { status: 200 });
  } catch (error: any) {
    console.error('[USER_PROFILE_PATCH]', error);
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, { status: 500 });
  }
}
