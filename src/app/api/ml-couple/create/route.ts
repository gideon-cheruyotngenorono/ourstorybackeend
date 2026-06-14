import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import crypto from 'crypto';
import { sendEmail } from '@/lib/email';

export async function POST(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Look for optional partnerEmail to send the invite directly
    let partnerEmail: string | undefined;
    try {
      const body = await req.json();
      partnerEmail = body.partnerEmail;
    } catch (e) {
      // Ignored, body might be empty
    }

    // Check if user is already in a couple (as partnerA or partnerB)
    const existingCouple = await prisma.couple.findFirst({
      where: {
        OR: [{ partnerAId: userId }, { partnerBId: userId }]
      }
    });

    if (existingCouple) {
      return NextResponse.json({ error: 'You are already in a couple connection' }, { status: 400 });
    }

    // Generate a unique 6-character invite code
    const inviteCode = crypto.randomBytes(3).toString('hex').toUpperCase();

    // Create a "pending" couple with just partnerA and the invite code
    const couple = await prisma.couple.create({
      data: {
        partnerAId: userId,
        inviteCode,
      }
    });

    if (partnerEmail) {
      const emailResult = await sendEmail({
        to: partnerEmail,
        subject: 'You have been invited to Our Story',
        html: `
          <h3>Our Story Invite</h3>
          <p>You have been invited to join a couple space on Our Story!</p>
          <p>Your invite code is: <strong style="letter-spacing: 2px;">${inviteCode}</strong></p>
          <p>Please enter this code in the app to join.</p>
        `
      });

      if (!emailResult.success) {
        console.warn('[COUPLE_CREATE] Failed to send invite email:', emailResult.error);
        // We still return success as the couple was created, but we notify client about the email failure
        return NextResponse.json({ 
          message: 'Couple created but email failed to send', 
          inviteCode, 
          couple 
        }, { status: 201 });
      }
    }

    return NextResponse.json({ 
      message: 'Pending couple created successfully!', 
      inviteCode, 
      couple 
    }, { status: 201 });

  } catch (error: any) {
    console.error('[COUPLE_CREATE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
