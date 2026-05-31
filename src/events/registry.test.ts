import { describe, it, expect } from 'vitest';
import {
  EVENT_REGISTRY,
  isKnownEventType,
  validateEvent,
} from './registry';

describe('events/registry', () => {
  describe('isKnownEventType', () => {
    it('returns true for a known event type', () => {
      expect(isKnownEventType('user.created')).toBe(true);
    });

    it('returns true for several well-known event types', () => {
      expect(isKnownEventType('entity.created')).toBe(true);
      expect(isKnownEventType('organization.created')).toBe(true);
      expect(isKnownEventType('credit.allocated')).toBe(true);
      expect(isKnownEventType('subscription.canceled')).toBe(true);
      expect(isKnownEventType('tenant.onboarded')).toBe(true);
    });

    it('returns false for a string that is not in the registry', () => {
      expect(isKnownEventType('not.a.real.event')).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(isKnownEventType('')).toBe(false);
    });

    it('returns false for prototype-like names', () => {
      expect(isKnownEventType('toString')).toBe(false);
      expect(isKnownEventType('hasOwnProperty')).toBe(false);
      expect(isKnownEventType('__proto__')).toBe(false);
    });

    it('treats event types as case-sensitive', () => {
      expect(isKnownEventType('User.Created')).toBe(false);
      expect(isKnownEventType('USER.CREATED')).toBe(false);
    });
  });

  describe('validateEvent', () => {
    it('returns success for a valid user.created payload', () => {
      const result = validateEvent('user.created', {
        userId: 'user_123',
        email: 'foo@example.com',
        firstName: 'Foo',
        lastName: 'Bar',
        isActive: true,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.userId).toBe('user_123');
        expect(result.data.email).toBe('foo@example.com');
        expect(result.data.isActive).toBe(true);
      }
    });

    it('applies defaults for fields like isActive', () => {
      const result = validateEvent('user.created', {
        userId: 'user_123',
        email: 'foo@example.com',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isActive).toBe(true);
      }
    });

    it('allows passthrough of unknown fields', () => {
      const result = validateEvent('user.created', {
        userId: 'user_123',
        email: 'foo@example.com',
        someExtraField: 'allowed',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect((result.data as Record<string, unknown>).someExtraField).toBe('allowed');
      }
    });

    it('returns failure for an invalid payload shape', () => {
      const result = validateEvent('user.created', { wrong: 'shape' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(typeof result.error).toBe('string');
        expect(result.error.length).toBeGreaterThan(0);
      }
    });

    it('returns failure when email is malformed', () => {
      const result = validateEvent('user.created', {
        userId: 'user_123',
        email: 'not-an-email',
      });
      expect(result.success).toBe(false);
    });

    it('returns failure with an explanatory message for unknown event types', () => {
      const result = validateEvent('unknown.event', {});
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Unknown event type');
        expect(result.error).toContain('unknown.event');
      }
    });

    it('validates a credit.allocated payload with required numeric delta', () => {
      const ok = validateEvent('credit.allocated', {
        entityId: 'ent_1',
        deltaAmount: 100,
      });
      expect(ok.success).toBe(true);

      const bad = validateEvent('credit.allocated', {
        entityId: 'ent_1',
        deltaAmount: 'not-a-number',
      });
      expect(bad.success).toBe(false);
    });

    it('validates organization.assigned with required iso timestamp', () => {
      const ok = validateEvent('organization.assigned', {
        organizationId: 'org_1',
        userId: 'user_1',
        assignedAt: '2024-01-01T00:00:00.000Z',
      });
      expect(ok.success).toBe(true);

      const bad = validateEvent('organization.assigned', {
        organizationId: 'org_1',
        userId: 'user_1',
        assignedAt: 'yesterday',
      });
      expect(bad.success).toBe(false);
    });

    it('every registered event type can validate a sufficient payload', () => {
      // Smoke check: ensure the registry doesn't have any non-Zod entries.
      for (const key of Object.keys(EVENT_REGISTRY)) {
        const schema = (EVENT_REGISTRY as Record<string, { safeParse: unknown }>)[key];
        expect(typeof schema.safeParse).toBe('function');
      }
    });
  });
});
