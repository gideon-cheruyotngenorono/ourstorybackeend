import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });

    let settings = await prisma.userNotificationSettings.findUnique({
      where: { userId }
    });

    if (!settings) {
      // Create default settings if they don't exist
      settings = await prisma.userNotificationSettings.create({
        data: { userId }
      });
    }

    return NextResponse.json({ data: settings }, { status: 200 });
  } catch (error: any) {
    console.error('[NOTIFY_PREFS_GET]', error);
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });

    const body = await req.json();
    const { pushEnabled, dailyReminder, chatNotifications, partnerActivity } = body;

    const dataToUpdate: any = {};
    if (typeof pushEnabled === 'boolean') dataToUpdate.pushEnabled = pushEnabled;
    if (typeof dailyReminder === 'boolean') dataToUpdate.dailyReminder = dailyReminder;
    if (typeof chatNotifications === 'boolean') dataToUpdate.chatNotifications = chatNotifications;
    if (typeof partnerActivity === 'boolean') dataToUpdate.partnerActivity = partnerActivity;

    const updatedSettings = await prisma.userNotificationSettings.upsert({
      where: { userId },
      update: dataToUpdate,
      create: {
        userId,
        ...dataToUpdate
      }
    });

    return NextResponse.json({ data: updatedSettings }, { status: 200 });
  } catch (error: any) {
    console.error('[NOTIFY_PREFS_PATCH]', error);
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, { status: 500 });
  }
}
