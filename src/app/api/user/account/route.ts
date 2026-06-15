import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { firebaseAdmin } from '@/lib/firebase';

export async function DELETE(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    const authHeader = req.headers.get('Authorization'); // The user must pass their token

    if (!userId || !authHeader) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });
    }

    // Attempt to verify re-authentication based on token or external confirm flow.
    // For now, presence of x-user-id is our primary gate, but for real destructive actions
    // the client should prompt the user to re-auth, yielding a fresh token.

    // 1. Delete user from auth.users (Supabase native Auth, if applicable)
    try {
      await prisma.$executeRaw`DELETE FROM auth.users WHERE id = ${userId}::uuid`;
    } catch (dbErr) {
      console.warn('[USER_ACCOUNT_DELETE] Failed deleting from auth.users directly. May not be present or UUID invalid.', dbErr);
    }

    // 2. Also try delete from Firebase Auth just in case since this project uses it for Google Auth
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user?.googleId) {
        await firebaseAdmin.auth().deleteUser(user.googleId);
      }
    } catch (fbErr) {
     console.warn('[USER_ACCOUNT_DELETE] Firebase deletion failed', fbErr);
    }

    // 3. Remove Couple logic if applicable
    const couple = await prisma.couple.findFirst({
      where: {
        OR: [{ partnerAId: userId }, { partnerBId: userId }]
      }
    });

    if (couple) {
      // Set to null or delete if it's the last partner
      if (couple.partnerBId === userId && couple.partnerAId) {
         await prisma.couple.update({ where: { id: couple.id }, data: { partnerBId: null } });
      } else if (couple.partnerAId === userId && couple.partnerBId) {
         // Switch partnerB to partnerA
         await prisma.couple.update({
           where: { id: couple.id },
           data: { partnerAId: couple.partnerBId, partnerBId: null }
         });
      } else {
         // Both or remaining partner is deleting, remove couple
         await prisma.couple.delete({ where: { id: couple.id } });
      }
    }

    // 4. Delete the User from Prisma (public.User or public.profiles equivalent)
    // Thanks to onDelete: Cascade on most models, relations will be deleted/handled.
    await prisma.user.delete({
      where: { id: userId }
    });

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error: any) {
    console.error('[USER_ACCOUNT_DELETE]', error);
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error during account deletion' } }, { status: 500 });
  }
}
