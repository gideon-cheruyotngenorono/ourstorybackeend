import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import prisma from '@/lib/prisma';
import { registerSchema } from '@/validators/auth';
import { signAccessToken, signRefreshToken } from '@/lib/jwt';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    // Require JSON Content-Type to avoid accidental empty form posts
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.toLowerCase().includes('application/json')) {
      console.error('[AUTH_REGISTER] invalid content-type', { contentType });
      return NextResponse.json({ error: 'Content-Type must be application/json' }, { status: 400 });
    }

    const raw = await req.text();
    if (!raw || raw.trim() === '') {
      console.error('[AUTH_REGISTER] empty request body');
      return NextResponse.json({ error: 'Invalid or empty JSON body' }, { status: 400 });
    }

    let body: any;
    try {
      body = JSON.parse(raw);
    } catch (jsonErr: any) {
      // Log a safe preview of the raw body to help debug client issues (truncate)
      console.error('[AUTH_REGISTER] failed to parse JSON body', {
        message: jsonErr?.message,
        contentType,
        bodyPreview: raw.slice(0, 1000),
      });
      return NextResponse.json({ error: 'Invalid or empty JSON body' }, { status: 400 });
    }

    // Mask sensitive fields when logging
    try {
      const safeBody = typeof body === 'object' && body !== null ? { ...body } : body;
      if (safeBody && typeof safeBody === 'object' && 'password' in safeBody) safeBody.password = '[REDACTED]';
      console.info('[AUTH_REGISTER] parsed body', {
        headers: {
          contentType,
          'user-agent': req.headers.get('user-agent') || undefined,
        },
        body: safeBody,
      });
    } catch (logErr) {
      // swallow logging errors
    }

    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { email, password, displayName } = parsed.data;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        displayName,
      },
    });

    const accessToken = signAccessToken({ userId: user.id });
    const refreshToken = signRefreshToken({ userId: user.id });

    // Store refresh token securely in an httpOnly cookie
    const cookieStore = await cookies();
    cookieStore.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return NextResponse.json(
      {
        message: 'Registration successful',
        user: { id: user.id, email: user.email, displayName: user.displayName },
        accessToken,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[AUTH_REGISTER]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
