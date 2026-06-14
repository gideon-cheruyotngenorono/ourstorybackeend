import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createCoupleSchema } from '@/validators/auth';

export async function POST(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();

    // Check if either is already in a couple
    const userAlreadyInCouple = await prisma.couple.findFirst({
      where: {
        OR: [
          { partnerAId: userId }, { partnerBId: userId }
        ]
      }
    });

    if (userAlreadyInCouple) {
      return NextResponse.json({ error: 'You are already in a couple.' }, { status: 400 });
    }

    // Handle Join via Invite Code
    if (body.inviteCode) {
      const inviteCode = body.inviteCode.toString().toUpperCase();
      const pendingCouple = await prisma.couple.findUnique({
        where: { inviteCode }
      });

      if (!pendingCouple) {
        return NextResponse.json({ error: 'Invalid or expired invite code' }, { status: 404 });
      }
      if (pendingCouple.partnerBId) {
        return NextResponse.json({ error: 'This invite code has already been used' }, { status: 400 });
      }
      if (pendingCouple.partnerAId === userId) {
        return NextResponse.json({ error: 'You cannot use your own invite code' }, { status: 400 });
      }

      // Link them together and clear the invite code so it can't be reused
      const couple = await prisma.couple.update({
        where: { id: pendingCouple.id },
        data: {
          partnerBId: userId,
          inviteCode: null // Consume the invite code
        }
      });

      return NextResponse.json({ message: 'Successfully joined via invite code!', couple }, { status: 200 });
    }

    // Handle Join via Email (Legacy / Alternative)
    const parsed = createCoupleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { partnerEmail, anniversaryDate } = parsed.data;
    if (!partnerEmail) {
      return NextResponse.json({ error: 'Partner email or invite code is required' }, { status: 400 });
    }

    // Find partner B
    const partnerB = await prisma.user.findUnique({ where: { email: partnerEmail } });
    if (!partnerB) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
    }

    if (partnerB.id === userId) {
      return NextResponse.json({ error: 'You cannot form a couple with yourself.' }, { status: 400 });
    }

    const partnerBAlreadyInCouple = await prisma.couple.findFirst({
      where: {
        OR: [
          { partnerAId: partnerB.id }, { partnerBId: partnerB.id }
        ]
      }
    });

    if (partnerBAlreadyInCouple) {
      return NextResponse.json({ error: 'Your partner is already in a couple.' }, { status: 400 });
    }

    const couple = await prisma.couple.create({
      data: {
        partnerAId: userId,
        partnerBId: partnerB.id,
        anniversaryDate: anniversaryDate ? new Date(anniversaryDate) : null,
      },
    });

    return NextResponse.json({ message: 'Couple linked successfully!', couple }, { status: 201 });
  } catch (error: any) {
    console.error('[COUPLE_JOIN]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
