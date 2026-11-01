import { describe, it, expect } from 'vitest';
import { authOptions } from '../src/lib/auth';

describe('Auth Configuration (TDD)', () => {
  it('should have Google provider properly configured and initialized as a provider object', () => {
    expect(authOptions).toBeDefined();
    expect(authOptions.providers).toBeDefined();
    expect(authOptions.providers.length).toBeGreaterThan(0);

    const googleProvider = authOptions.providers.find(
      (p) => p.id === 'google'
    );
    expect(googleProvider).toBeDefined();
    expect(googleProvider?.name).toBe('Google');
    expect(googleProvider?.type).toBe('oauth');
  });

  it('should provide default NEXTAUTH_SECRET and session callbacks', async () => {
    expect(authOptions.secret).toBeDefined();
    expect(typeof authOptions.secret).toBe('string');
    expect(authOptions.secret?.length).toBeGreaterThan(0);

    const sessionCallback = authOptions.callbacks?.session;
    expect(sessionCallback).toBeDefined();

    if (sessionCallback) {
      const mockSession = { user: { name: 'Hunter' }, expires: '1' };
      const mockToken = { sub: 'hunter-123' };
      const sessionResult = await sessionCallback({
        session: mockSession as any,
        token: mockToken as any,
        user: {} as any,
        newSession: {} as any,
        trigger: 'update'
      });
      expect((sessionResult.user as any).id).toBe('hunter-123');
    }
  });
});
