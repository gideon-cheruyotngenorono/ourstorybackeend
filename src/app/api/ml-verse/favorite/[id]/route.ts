import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });

    const { id: verseId } = await params;

    const couple = await prisma.couple.findFirst({
      where: { OR: [{ partnerAId: userId }, { partnerBId: userId }] }
    });

    if (!couple) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Couple connection not found' } }, { status: 404 });
    }

    const verse = await prisma.verse.findUnique({
      where: { id: verseId }
    });

    if (!verse) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Verse not found' } }, { status: 404 });
    }

    // Toggle favorite logic
    const existingFavorite = await prisma.coupleFavoriteVerse.findFirst({
      where: { coupleId: couple.id, verseId }
    });

    if (existingFavorite) {
      // Remove favorite
      await prisma.coupleFavoriteVerse.delete({ where: { id: existingFavorite.id } });
      return NextResponse.json({ message: 'Verse removed from favorites', isFavorite: false }, { status: 200 });
    } else {
      // Add favorite
      const newFavorite = await prisma.coupleFavoriteVerse.create({
        data: {
          coupleId: couple.id,
          verseId,
          reference: verse.reference,
          text: verse.text,
        }
      });
      return NextResponse.json({ message: 'Verse added to favorites', isFavorite: true, data: newFavorite }, { status: 200 });
    }

  } catch (error: any) {
    console.error('[VERSE_FAVORITE_POST]', error);
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, { status: 500 });
  }
}
