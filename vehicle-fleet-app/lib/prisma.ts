import { PrismaClient } from '@prisma/client';
import { sheetsClient } from './storage/sheets';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const backend = process.env.DATA_BACKEND || 'postgres';
if (!['postgres', 'google-sheets'].includes(backend)) throw new Error('Invalid DATA_BACKEND');
export const prisma = backend === 'google-sheets' ? sheetsClient : (globalForPrisma.prisma || new PrismaClient());

if (backend === 'postgres' && process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
