/**
 * OAuth Adapter Unit Tests
 * Tests for Google and Microsoft OAuth profile adapters
 */

import { adaptGoogle } from '../google.adapter';
import { adaptMicrosoft } from '../microsoft.adapter';
import { isGoogle, isMicrosoft } from '../../../types/auth/oauth';

describe('OAuth Adapters', () => {
  describe('adaptGoogle', () => {
    it('should adapt valid Google profile with all fields', () => {
      const raw = {
        sub: 'google-user-123',
        email: 'user@example.com',
        email_verified: true,
        name: 'John Doe',
        given_name: 'John',
        family_name: 'Doe',
        picture: 'https://example.com/photo.jpg'
      };

      const result = adaptGoogle(raw);

      expect(result.kind).toBe('google');
      expect(result.sub).toBe('google-user-123');
      expect(result.email).toBe('user@example.com');
      expect(result.emailVerified).toBe(true);
      expect(result.name).toBe('John Doe');
      expect(result.picture).toBe('https://example.com/photo.jpg');
    });

    it('should adapt Google profile with minimal fields', () => {
      const raw = {
        sub: 'google-user-456',
        email: 'minimal@example.com'
      };

      const result = adaptGoogle(raw);

      expect(result.kind).toBe('google');
      expect(result.sub).toBe('google-user-456');
      expect(result.email).toBe('minimal@example.com');
      expect(result.emailVerified).toBe(false);
      expect(result.name).toBeUndefined();
      expect(result.picture).toBeUndefined();
    });

    it('should construct name from given_name and family_name', () => {
      const raw = {
        sub: 'google-user-789',
        email: 'name@example.com',
        given_name: 'Jane',
        family_name: 'Smith'
      };

      const result = adaptGoogle(raw);

      expect(result.name).toBe('Jane Smith');
    });

    it('should handle alternative email field from emails array', () => {
      const raw = {
        sub: 'google-user-abc',
        emails: [{ value: 'array@example.com' }]
      };

      const result = adaptGoogle(raw);

      expect(result.email).toBe('array@example.com');
    });

    it('should handle alternative sub field (id)', () => {
      const raw = {
        id: 'google-id-123',
        email: 'id@example.com'
      };

      const result = adaptGoogle(raw);

      expect(result.sub).toBe('google-id-123');
    });

    it('should handle alternative sub field (userId)', () => {
      const raw = {
        userId: 'google-userid-456',
        email: 'userid@example.com'
      };

      const result = adaptGoogle(raw);

      expect(result.sub).toBe('google-userid-456');
    });

    it('should throw error if email is missing', () => {
      const raw = {
        sub: 'google-user-123'
      };

      expect(() => adaptGoogle(raw)).toThrow('Invalid Google profile: missing email or sub');
    });

    it('should throw error if sub is missing', () => {
      const raw = {
        email: 'nosub@example.com'
      };

      expect(() => adaptGoogle(raw)).toThrow('Invalid Google profile: missing email or sub');
    });

    it('should throw error if both email and sub are missing', () => {
      const raw = {};

      expect(() => adaptGoogle(raw)).toThrow('Invalid Google profile: missing email or sub');
    });
  });

  describe('adaptMicrosoft', () => {
    it('should adapt valid Microsoft profile with all fields', () => {
      const raw = {
        oid: 'ms-user-123',
        mail: 'user@company.com',
        displayName: 'John Doe',
        name: 'John Doe'
      };

      const result = adaptMicrosoft(raw);

      expect(result.kind).toBe('microsoft');
      expect(result.oid).toBe('ms-user-123');
      expect(result.email).toBe('user@company.com');
      expect(result.name).toBe('John Doe');
      expect(result.picture).toBeUndefined();
    });

    it('should adapt Microsoft profile with minimal fields', () => {
      const raw = {
        oid: 'ms-user-456',
        userPrincipalName: 'minimal@company.com'
      };

      const result = adaptMicrosoft(raw);

      expect(result.kind).toBe('microsoft');
      expect(result.oid).toBe('ms-user-456');
      expect(result.email).toBe('minimal@company.com');
      expect(result.name).toBeUndefined();
    });

    it('should prefer mail over userPrincipalName', () => {
      const raw = {
        oid: 'ms-user-789',
        mail: 'preferred@company.com',
        userPrincipalName: 'secondary@company.com'
      };

      const result = adaptMicrosoft(raw);

      expect(result.email).toBe('preferred@company.com');
    });

    it('should handle alternative email field', () => {
      const raw = {
        oid: 'ms-user-abc',
        email: 'alt@company.com'
      };

      const result = adaptMicrosoft(raw);

      expect(result.email).toBe('alt@company.com');
    });

    it('should handle alternative oid field (id)', () => {
      const raw = {
        id: 'ms-id-123',
        mail: 'id@company.com'
      };

      const result = adaptMicrosoft(raw);

      expect(result.oid).toBe('ms-id-123');
    });

    it('should handle alternative oid field (sub)', () => {
      const raw = {
        sub: 'ms-sub-456',
        mail: 'sub@company.com'
      };

      const result = adaptMicrosoft(raw);

      expect(result.oid).toBe('ms-sub-456');
    });

    it('should prefer displayName over name', () => {
      const raw = {
        oid: 'ms-user-xyz',
        mail: 'display@company.com',
        displayName: 'Display Name',
        name: 'Regular Name'
      };

      const result = adaptMicrosoft(raw);

      expect(result.name).toBe('Display Name');
    });

    it('should throw error if email is missing', () => {
      const raw = {
        oid: 'ms-user-123'
      };

      expect(() => adaptMicrosoft(raw)).toThrow('Invalid Microsoft profile: missing email or oid');
    });

    it('should throw error if oid is missing', () => {
      const raw = {
        mail: 'nooid@company.com'
      };

      expect(() => adaptMicrosoft(raw)).toThrow('Invalid Microsoft profile: missing email or oid');
    });

    it('should throw error if both email and oid are missing', () => {
      const raw = {};

      expect(() => adaptMicrosoft(raw)).toThrow('Invalid Microsoft profile: missing email or oid');
    });
  });

  describe('Type Guards', () => {
    describe('isGoogle', () => {
      it('should return true for valid Google profile', () => {
        const profile = {
          kind: 'google',
          email: 'user@example.com',
          sub: 'google-123',
          emailVerified: true
        };

        expect(isGoogle(profile)).toBe(true);
      });

      it('should return false for Microsoft profile', () => {
        const profile = {
          kind: 'microsoft',
          email: 'user@company.com',
          oid: 'ms-123'
        };

        expect(isGoogle(profile)).toBe(false);
      });

      it('should return false for null', () => {
        expect(isGoogle(null)).toBe(false);
      });

      it('should return false for undefined', () => {
        expect(isGoogle(undefined)).toBe(false);
      });

      it('should return false for non-object', () => {
        expect(isGoogle('string')).toBe(false);
        expect(isGoogle(123)).toBe(false);
      });

      it('should return false if missing required fields', () => {
        expect(isGoogle({ kind: 'google' })).toBe(false);
        expect(isGoogle({ kind: 'google', email: 'test@example.com' })).toBe(false);
        expect(isGoogle({ kind: 'google', sub: 'google-123' })).toBe(false);
      });
    });

    describe('isMicrosoft', () => {
      it('should return true for valid Microsoft profile', () => {
        const profile = {
          kind: 'microsoft',
          email: 'user@company.com',
          oid: 'ms-123'
        };

        expect(isMicrosoft(profile)).toBe(true);
      });

      it('should return false for Google profile', () => {
        const profile = {
          kind: 'google',
          email: 'user@example.com',
          sub: 'google-123',
          emailVerified: true
        };

        expect(isMicrosoft(profile)).toBe(false);
      });

      it('should return false for null', () => {
        expect(isMicrosoft(null)).toBe(false);
      });

      it('should return false for undefined', () => {
        expect(isMicrosoft(undefined)).toBe(false);
      });

      it('should return false for non-object', () => {
        expect(isMicrosoft('string')).toBe(false);
        expect(isMicrosoft(123)).toBe(false);
      });

      it('should return false if missing required fields', () => {
        expect(isMicrosoft({ kind: 'microsoft' })).toBe(false);
        expect(isMicrosoft({ kind: 'microsoft', email: 'test@company.com' })).toBe(false);
        expect(isMicrosoft({ kind: 'microsoft', oid: 'ms-123' })).toBe(false);
      });
    });
  });
});
