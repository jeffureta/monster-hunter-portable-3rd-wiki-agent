import { type NextAuthOptions } from 'next-auth';
import rawGoogleProvider from 'next-auth/providers/google';

// Normalize ESM/CJS default export variations across bundlers/environments
const GoogleProvider =
  typeof rawGoogleProvider === 'function'
    ? rawGoogleProvider
    : (rawGoogleProvider as any).default;

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        (session.user as any).id = token.sub;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || 'development-secret-mhp3rd-search-key',
};

