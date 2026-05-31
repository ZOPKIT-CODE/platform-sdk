import { describe, it, expect } from 'vitest';
import { parseSNSEnvelope, SNSEnvelopeParseError } from './envelope';

const validEnvelope = {
  event_id: '11111111-1111-4111-8111-111111111111',
  event_type: 'user.created',
  timestamp: '2024-01-01T00:00:00.000Z',
  source_service: 'wrapper',
  tenant_id: '22222222-2222-4222-8222-222222222222',
  payload: { userId: 'user_123', email: 'foo@example.com' },
  version: 1,
};

describe('messaging/envelope', () => {
  describe('parseSNSEnvelope', () => {
    it('parses a raw event JSON envelope (not SNS-wrapped)', () => {
      const result = parseSNSEnvelope(JSON.stringify(validEnvelope));
      expect(result.wasSNSWrapped).toBe(false);
      expect(result.envelope.event_id).toBe(validEnvelope.event_id);
      expect(result.envelope.event_type).toBe('user.created');
      expect(result.envelope.source_service).toBe('wrapper');
      expect(result.envelope.tenant_id).toBe(validEnvelope.tenant_id);
    });

    it('parses an SNS-wrapped notification', () => {
      const body = JSON.stringify({
        Type: 'Notification',
        Message: JSON.stringify(validEnvelope),
      });
      const result = parseSNSEnvelope(body);
      expect(result.wasSNSWrapped).toBe(true);
      expect(result.envelope.event_type).toBe('user.created');
    });

    it('applies the version default when missing', () => {
      const envelopeWithoutVersion = { ...validEnvelope } as Record<string, unknown>;
      delete envelopeWithoutVersion.version;
      const result = parseSNSEnvelope(JSON.stringify(envelopeWithoutVersion));
      expect(result.envelope.version).toBe(1);
    });

    it('throws SNSEnvelopeParseError with stage "outer-json" for malformed JSON', () => {
      expect(() => parseSNSEnvelope('not-json{{{')).toThrow(SNSEnvelopeParseError);
      try {
        parseSNSEnvelope('not-json{{{');
      } catch (err) {
        expect(err).toBeInstanceOf(SNSEnvelopeParseError);
        expect((err as SNSEnvelopeParseError).stage).toBe('outer-json');
      }
    });

    it('throws SNSEnvelopeParseError with stage "sns-message-json" when SNS Message is malformed', () => {
      const body = JSON.stringify({
        Type: 'Notification',
        Message: 'not-json{{{',
      });
      try {
        parseSNSEnvelope(body);
        throw new Error('expected throw');
      } catch (err) {
        expect(err).toBeInstanceOf(SNSEnvelopeParseError);
        expect((err as SNSEnvelopeParseError).stage).toBe('sns-message-json');
      }
    });

    it('throws SNSEnvelopeParseError with stage "envelope-validation" when required fields are missing', () => {
      const broken = { foo: 'bar' };
      try {
        parseSNSEnvelope(JSON.stringify(broken));
        throw new Error('expected throw');
      } catch (err) {
        expect(err).toBeInstanceOf(SNSEnvelopeParseError);
        expect((err as SNSEnvelopeParseError).stage).toBe('envelope-validation');
      }
    });

    it('throws envelope-validation when source_service is not in SERVICE_NAMES', () => {
      const bad = { ...validEnvelope, source_service: 'mystery' };
      expect(() => parseSNSEnvelope(JSON.stringify(bad))).toThrow(SNSEnvelopeParseError);
    });

    it('throws envelope-validation when tenant_id is not a UUID', () => {
      const bad = { ...validEnvelope, tenant_id: 'not-a-uuid' };
      expect(() => parseSNSEnvelope(JSON.stringify(bad))).toThrow(SNSEnvelopeParseError);
    });

    it('does NOT mark as SNS-wrapped when Type is missing even if Message is a string', () => {
      const body = JSON.stringify({
        ...validEnvelope,
        Message: 'irrelevant',
      });
      const result = parseSNSEnvelope(body);
      expect(result.wasSNSWrapped).toBe(false);
    });

    it('does NOT mark as SNS-wrapped when Type is wrong', () => {
      const body = JSON.stringify({
        Type: 'SubscriptionConfirmation',
        Message: JSON.stringify(validEnvelope),
      });
      // The outer object is not the envelope shape and Type !== 'Notification'
      // → not unwrapped → falls through to envelope-validation failure.
      try {
        parseSNSEnvelope(body);
        throw new Error('expected throw');
      } catch (err) {
        expect(err).toBeInstanceOf(SNSEnvelopeParseError);
        expect((err as SNSEnvelopeParseError).stage).toBe('envelope-validation');
      }
    });

    it('SNSEnvelopeParseError carries the .name property', () => {
      try {
        parseSNSEnvelope('not-json');
      } catch (err) {
        expect((err as Error).name).toBe('SNSEnvelopeParseError');
      }
    });
  });
});
