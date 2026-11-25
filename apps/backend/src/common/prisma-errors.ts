import { Prisma } from '../generated/prisma/client';

export const isUniqueViolation = (e: unknown): boolean =>
  e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';

export const DUPLICATE_ORG_MESSAGE =
  'An organisation with this RC number or email, or an account with this admin email, already exists';
