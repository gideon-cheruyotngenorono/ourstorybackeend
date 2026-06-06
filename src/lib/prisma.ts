import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

// Keep a global singleton in development to avoid exhausting database connections
declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined
}

const connectionString = process.env.DATABASE_URL
let prisma: PrismaClient

// Construct a pg Pool and adapter for Prisma v7 which expects an adapter or accelerateUrl
if (!connectionString) {
  // Fallback to constructing without adapter so imports don't completely fail in very constrained envs
  prisma = globalThis.prismaGlobal ?? new PrismaClient()
} else {
  const pool = new Pool({ connectionString })
  const adapter = new PrismaPg(pool)
  prisma = globalThis.prismaGlobal ?? new PrismaClient({ adapter })
}

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma
