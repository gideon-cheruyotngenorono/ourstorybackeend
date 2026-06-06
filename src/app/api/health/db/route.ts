import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    // Simple query to validate DB connectivity
    const result = await prisma.$queryRaw`SELECT 1 as ok`
    return NextResponse.json({ ok: true, result }, { status: 200 })
  } catch (error) {
    console.error('[HEALTH_DB] DB connectivity check failed', error)
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 })
  }
}
