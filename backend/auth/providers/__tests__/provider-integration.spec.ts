/**
 * OAuth Provider Integration Tests
 * Tests for the normalizeOAuthProfile function with discriminated unions
 */

import { normalizeOAuthProfile } from '../normalize';
import type { OAuthProfile, GoogleAdapter, MicrosoftAdapter } from '../../../types/auth/oauth';

describe('OAuth Provider Integration', () => {
  describe('normalizeOAuthProfile', () => {
    describe('Google Provider', () => {
      it('should normalize Google profile and return GoogleAdapter discriminated union', () => {
        const raw = {
          sub: 'google-user-123',
          email: 'user@example.com',
          email_verified: true,
          name: 'John Doe',
          picture: 'https://example.com/photo.jpg'
        };

        const result = normalizeOAuthProfile('google', raw);

        expect(result.kind).toBe('google');

        // Type narrowing test
        if (result.kind === 'google') {
          expect(result.sub).toBe('google-user-123');
          expect(result.email).toBe('user@example.com');
          expect(result.emailVerified).toBe(true);
          expect(result.name).toBe('John Doe');
          expect(result.picture).toBe('https://example.com/photo.jpg');

          // TypeScript should know this is a GoogleAdapter
          const googleProfile: GoogleAdapter = result;
          expect(googleProfile.sub).toBeDefined();
        }
      });

      it('should handle Google profile with alternative field names', () => {
        const raw = {
          id: 'google-id-456',
          emails: [{ value: 'alt@example.com' }],
          verified_email: false,
          given_name: 'Jane',
          family_name: 'Smith'
        };

        const result = normalizeOAuthProfile('google', raw);

        expect(result.kind).toBe('google');

        if (result.kind === 'google') {
          expect(result.sub).toBe('google-id-456');
          expect(result.email).toBe('alt@example.com');
          expect(result.emailVerified).toBe(false);
          expect(result.name).toBe('Jane Smith');
        }
      });

      it('should throw error for invalid Google profile', () => {
        const raw = {
          sub: 'google-user-789'
          // Missing email
        };

        expect(() => normalizeOAuthProfile('google', raw))
          .toThrow('Invalid Google profile: missing email or sub');
      });
    });

    describe('Microsoft Provider', () => {
      it('should normalize Microsoft profile and return MicrosoftAdapter discriminated union', () => {
        const raw = {
          oid: 'ms-user-123',
          mail: 'user@company.com',
          displayName: 'John Doe'
        };

        const result = normalizeOAuthProfile('microsoft', raw);

        expect(result.kind).toBe('microsoft');

        // Type narrowing test
        if (result.kind === 'microsoft') {
          expect(result.oid).toBe('ms-user-123');
          expect(result.email).toBe('user@company.com');
          expect(result.name).toBe('John Doe');

          // TypeScript should know this is a MicrosoftAdapter
          const microsoftProfile: MicrosoftAdapter = result;
          expect(microsoftProfile.oid).toBeDefined();
        }
      });

      it('should handle Microsoft profile with alternative field names', () => {
        const raw = {
          id: 'ms-id-456',
          userPrincipalName: 'user@company.com',
          name: 'Jane Smith'
        };

        const result = normalizeOAuthProfile('microsoft', raw);

        expect(result.kind).toBe('microsoft');

        if (result.kind === 'microsoft') {
          expect(result.oid).toBe('ms-id-456');
          expect(result.email).toBe('user@company.com');
          expect(result.name).toBe('Jane Smith');
        }
      });

      it('should throw error for invalid Microsoft profile', () => {
        const raw = {
          oid: 'ms-user-789'
          // Missing email
        };

        expect(() => normalizeOAuthProfile('microsoft', raw))
          .toThrow('Invalid Microsoft profile: missing email or oid');
      });
    });

    describe('Type Discrimination', () => {
      it('should allow type-safe handling of Google profile', () => {
        const raw = {
          sub: 'google-123',
          email: 'google@example.com',
          email_verified: true
        };

        const profile: OAuthProfile = normalizeOAuthProfile('google', raw);

        // Type guard pattern
        switch (profile.kind) {
          case 'google':
            expect(profile.sub).toBe('google-123');
            expect(profile.emailVerified).toBe(true);
            // TypeScript knows profile is GoogleAdapter here
            // @ts-expect-error - oid doesn't exist on GoogleAdapter
            const shouldNotExist = profile.oid;
            break;
          case 'microsoft':
            fail('Should not be Microsoft profile');
            break;
        }
      });

      it('should allow type-safe handling of Microsoft profile', () => {
        const raw = {
          oid: 'ms-123',
          mail: 'microsoft@company.com'
        };

        const profile: OAuthProfile = normalizeOAuthProfile('microsoft', raw);

        // Type guard pattern
        switch (profile.kind) {
          case 'google':
            fail('Should not be Google profile');
            break;
          case 'microsoft':
            expect(profile.oid).toBe('ms-123');
            // TypeScript knows profile is MicrosoftAdapter here
            // @ts-expect-error - sub doesn't exist on MicrosoftAdapter
            const shouldNotExist = profile.sub;
            break;
        }
      });

      it('should handle multiple profiles in type-safe array', () => {
        const googleRaw = {
          sub: 'google-123',
          email: 'google@example.com',
          email_verified: true
        };

        const microsoftRaw = {
          oid: 'ms-123',
          mail: 'microsoft@company.com'
        };

        const profiles: OAuthProfile[] = [
          normalizeOAuthProfile('google', googleRaw),
          normalizeOAuthProfile('microsoft', microsoftRaw)
        ];

        expect(profiles).toHaveLength(2);
        expect(profiles[0].kind).toBe('google');
        expect(profiles[1].kind).toBe('microsoft');

        // Type-safe iteration
        profiles.forEach(profile => {
          if (profile.kind === 'google') {
            expect(profile.sub).toBeDefined();
            expect(profile.emailVerified).toBeDefined();
          } else if (profile.kind === 'microsoft') {
            expect(profile.oid).toBeDefined();
          }
        });
      });
    });

    describe('Error Handling', () => {
      it('should throw error for unsupported provider', () => {
        const raw = {
          id: 'some-id',
          email: 'test@example.com'
        };

        // @ts-expect-error - testing runtime error for invalid provider
        expect(() => normalizeOAuthProfile('facebook', raw))
          .toThrow('Unsupported provider: facebook');
      });

      it('should handle null raw data gracefully', () => {
        expect(() => normalizeOAuthProfile('google', null as any))
          .toThrow('Invalid Google profile: missing email or sub');
      });

      it('should handle undefined raw data gracefully', () => {
        expect(() => normalizeOAuthProfile('microsoft', undefined as any))
          .toThrow('Invalid Microsoft profile: missing email or oid');
      });

      it('should handle empty object gracefully', () => {
        expect(() => normalizeOAuthProfile('google', {}))
          .toThrow('Invalid Google profile: missing email or sub');

        expect(() => normalizeOAuthProfile('microsoft', {}))
          .toThrow('Invalid Microsoft profile: missing email or oid');
      });
    });

    describe('Field Normalization', () => {
      it('should normalize various Google email field formats', () => {
        const variants = [
          { sub: '1', email: 'direct@example.com' },
          { sub: '2', emails: [{ value: 'array@example.com' }] }
        ];

        variants.forEach((raw, index) => {
          const result = normalizeOAuthProfile('google', raw);
          expect(result.kind).toBe('google');
          expect(result.email).toBeTruthy();
        });
      });

      it('should normalize various Microsoft email field formats', () => {
        const variants = [
          { oid: '1', mail: 'mail@company.com' },
          { oid: '2', userPrincipalName: 'upn@company.com' },
          { oid: '3', email: 'email@company.com' }
        ];

        variants.forEach((raw, index) => {
          const result = normalizeOAuthProfile('microsoft', raw);
          expect(result.kind).toBe('microsoft');
          expect(result.email).toBeTruthy();
        });
      });

      it('should normalize various Google ID field formats', () => {
        const variants = [
          { sub: 'sub-123', email: 'test1@example.com' },
          { id: 'id-456', email: 'test2@example.com' },
          { userId: 'user-789', email: 'test3@example.com' }
        ];

        variants.forEach(raw => {
          const result = normalizeOAuthProfile('google', raw);
          expect(result.kind).toBe('google');
          if (result.kind === 'google') {
            expect(result.sub).toBeTruthy();
          }
        });
      });

      it('should normalize various Microsoft ID field formats', () => {
        const variants = [
          { oid: 'oid-123', mail: 'test1@company.com' },
          { id: 'id-456', mail: 'test2@company.com' },
          { sub: 'sub-789', mail: 'test3@company.com' }
        ];

        variants.forEach(raw => {
          const result = normalizeOAuthProfile('microsoft', raw);
          expect(result.kind).toBe('microsoft');
          if (result.kind === 'microsoft') {
            expect(result.oid).toBeTruthy();
          }
        });
      });
    });
  });
});
