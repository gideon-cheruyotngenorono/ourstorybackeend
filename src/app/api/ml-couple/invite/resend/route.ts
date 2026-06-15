import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import crypto from 'crypto';
import { sendEmail } from '@/lib/email';

export async function POST(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });

    const body = await req.json();
    const { partnerEmail } = body;

    if (!partnerEmail) {
      return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'partnerEmail is required to resend invite' } }, { status: 400 });
    }

    const couple = await prisma.couple.findFirst({
      where: {
        partnerAId: userId,
        partnerBId: null,
      }
    });

    if (!couple) {
      return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'No pending couple connection found to resend invite for' } }, { status: 400 });
    }

    // Regenerate a new invite code or use the existing one?
    // Let's regenerate to be safe and reset it
    const newInviteCode = crypto.randomBytes(3).toString('hex').toUpperCase();

    await prisma.couple.update({
      where: { id: couple.id },
      data: { inviteCode: newInviteCode }
    });

    const emailResult = await sendEmail({
      to: partnerEmail,
      subject: 'Reminder: You have been invited to Our Story',
      html: `
        <h3>Our Story Invite</h3>
        <p>You have been invited to join a couple space on Our Story!</p>
        <p>Your invite code is: <strong style="letter-spacing: 2px;">${newInviteCode}</strong></p>
        <p>Please enter this code in the app to join.</p>
      `
    });

    if (!emailResult.success) {
      console.warn('[COUPLE_RESEND_INVITE] Failed to send invite email:', emailResult.error);
      return NextResponse.json({ 
        error: { code: 'EXTERNAL_ERROR', message: 'Failed to send invite email' } 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Invite resent successfully',
      inviteCode: newInviteCode 
    }, { status: 200 });

  } catch (error: any) {
    console.error('[COUPLE_RESEND_INVITE]', error);
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, { status: 500 });
  }
}
