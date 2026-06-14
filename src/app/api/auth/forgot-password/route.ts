import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendEmail } from '@/lib/email';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'email is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Don't leak whether the email exists or not to prevent user enumeration
      return NextResponse.json({ success: true, message: 'If an account exists, a reset link was sent.' }, { status: 200 });
    }

    // Deconstruct old tokens
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id }
    });

    // Create a robust 6-digit confirmation PIN (or UUID if link is preferred)
    const pin = Math.floor(100000 + Math.random() * 900000).toString(); // "538291"
    
    // Expires in 15 minutes
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: pin,
        expiresAt
      }
    });

    // Send the email
    const emailResult = await sendEmail({
      to: user.email,
      subject: 'Your Password Reset Request',
      html: `
        <h3>Our Story - Password Reset</h3>
        <p>You requested a password reset. Your 6-digit secure code is:</p>
        <h2 style="letter-spacing: 5px;">${pin}</h2>
        <p>This code will expire in 15 minutes. If you did not request this, please ignore this email.</p>
      `
    });

    if (!emailResult.success) {
      console.warn('[AUTH_FORGOT_PASSWORD] Email failed, but pin generated:', pin, 'Error:', emailResult.error);
      // Even if email fails, we don't necessarily want to leak that the email exists or crash,
      // but if the dev wants to know why it's failing, we log it.
    }

    return NextResponse.json({ success: true, message: 'If an account exists, a reset link was sent.' }, { status: 200 });
  } catch (error: any) {
    console.error('[AUTH_FORGOT_PASSWORD]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
