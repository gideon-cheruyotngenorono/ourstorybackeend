import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function DELETE(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });
    }

    const couple = await prisma.couple.findFirst({
      where: {
        OR: [{ partnerAId: userId }, { partnerBId: userId }]
      }
    });

    if (!couple) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'You are not part of any couple' } }, { status: 404 });
    }

    // Identify partner to send notification if possible
    const partnerId = couple.partnerAId === userId ? couple.partnerBId : couple.partnerAId;

    // Send notification to partner
    if (partnerId) {
      await prisma.notification.create({
        data: {
          userId: partnerId,
          type: 'COUPLE_DELETED',
          title: 'Couple Connection Removed',
          body: 'Your partner has removed the couple connection and all related data was wiped.',
        }
      });
    }

    // Delete couple (Due to cascade relations, this automatically wipes chat messages, notes, jar entries, timeline events if setup correctly)
    // If not setup to cascade on prisma, we will do it manually:
    await prisma.$transaction([
      prisma.message.deleteMany({ where: { coupleId: couple.id } }),
      prisma.note.deleteMany({ where: { coupleId: couple.id } }),
      prisma.jarReason.deleteMany({ where: { coupleId: couple.id } }),
      prisma.prayer.deleteMany({ where: { coupleId: couple.id } }),
      prisma.reflection.deleteMany({ where: { coupleId: couple.id } }),
      prisma.timelineEvent.deleteMany({ where: { coupleId: couple.id } }),
      prisma.letter.deleteMany({ where: { coupleId: couple.id } }),
      prisma.gratitudeEntry.deleteMany({ where: { coupleId: couple.id } }),
      prisma.coupleFavoriteVerse.deleteMany({ where: { coupleId: couple.id } }),
      prisma.couple.delete({ where: { id: couple.id } })
    ]);

    return NextResponse.json({ success: true, message: 'Couple connection and all shared data deleted' }, { status: 200 });

  } catch (error: any) {
    console.error('[COUPLE_DELETE]', error);
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, { status: 500 });
  }
}
