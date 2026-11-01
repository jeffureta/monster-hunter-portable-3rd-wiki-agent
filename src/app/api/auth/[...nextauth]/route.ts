import rawNextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

const NextAuth =
  typeof rawNextAuth === 'function'
    ? rawNextAuth
    : (rawNextAuth as any).default;

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

