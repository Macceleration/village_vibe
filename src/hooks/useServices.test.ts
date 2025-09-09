import { describe, it, expect } from 'vitest';
import { validateServiceEvent, validateServiceMatchEvent, extractServiceData, calculateDistance, formatDistance } from './useServices';
import type { NostrEvent } from '@nostrify/nostrify';

describe('useServices', () => {
  describe('validateServiceEvent', () => {
    it('should validate a correct service offer event', () => {
      const event: NostrEvent = {
        id: 'test-id',
        pubkey: 'test-pubkey',
        created_at: Date.now() / 1000,
        kind: 38857,
        content: 'Test service offer',
        tags: [
          ['d', 'offer-001'],
          ['tribe', 'test-tribe'],
          ['t', 'yardwork'],
          ['l', '42.3314,-83.0458'],
        ],
        sig: 'test-sig',
      };

      expect(validateServiceEvent(event)).toBe(true);
    });

    it('should validate a correct service request event', () => {
      const event: NostrEvent = {
        id: 'test-id',
        pubkey: 'test-pubkey',
        created_at: Date.now() / 1000,
        kind: 30627,
        content: 'Test service request',
        tags: [
          ['d', 'request-001'],
          ['tribe', 'test-tribe'],
          ['t', 'pets'],
          ['l', '42.3314,-83.0458'],
        ],
        sig: 'test-sig',
      };

      expect(validateServiceEvent(event)).toBe(true);
    });

    it('should reject event with wrong kind', () => {
      const event: NostrEvent = {
        id: 'test-id',
        pubkey: 'test-pubkey',
        created_at: Date.now() / 1000,
        kind: 1,
        content: 'Test content',
        tags: [
          ['d', 'test'],
          ['tribe', 'test-tribe'],
          ['t', 'yardwork'],
          ['l', '42.3314,-83.0458'],
        ],
        sig: 'test-sig',
      };

      expect(validateServiceEvent(event)).toBe(false);
    });

    it('should reject event missing required tags', () => {
      const event: NostrEvent = {
        id: 'test-id',
        pubkey: 'test-pubkey',
        created_at: Date.now() / 1000,
        kind: 38857,
        content: 'Test content',
        tags: [
          ['d', 'test'],
          // Missing tribe, category, and location tags
        ],
        sig: 'test-sig',
      };

      expect(validateServiceEvent(event)).toBe(false);
    });

    it('should reject event with invalid category', () => {
      const event: NostrEvent = {
        id: 'test-id',
        pubkey: 'test-pubkey',
        created_at: Date.now() / 1000,
        kind: 38857,
        content: 'Test content',
        tags: [
          ['d', 'test'],
          ['tribe', 'test-tribe'],
          ['t', 'invalid-category'],
          ['l', '42.3314,-83.0458'],
        ],
        sig: 'test-sig',
      };

      expect(validateServiceEvent(event)).toBe(false);
    });

    it('should reject event with invalid location format', () => {
      const event: NostrEvent = {
        id: 'test-id',
        pubkey: 'test-pubkey',
        created_at: Date.now() / 1000,
        kind: 38857,
        content: 'Test content',
        tags: [
          ['d', 'test'],
          ['tribe', 'test-tribe'],
          ['t', 'yardwork'],
          ['l', 'invalid-location'],
        ],
        sig: 'test-sig',
      };

      expect(validateServiceEvent(event)).toBe(false);
    });

    it('should reject event with content too long', () => {
      const event: NostrEvent = {
        id: 'test-id',
        pubkey: 'test-pubkey',
        created_at: Date.now() / 1000,
        kind: 38857,
        content: 'a'.repeat(141), // 141 characters, over the 140 limit
        tags: [
          ['d', 'test'],
          ['tribe', 'test-tribe'],
          ['t', 'yardwork'],
          ['l', '42.3314,-83.0458'],
        ],
        sig: 'test-sig',
      };

      expect(validateServiceEvent(event)).toBe(false);
    });
  });

  describe('validateServiceMatchEvent', () => {
    it('should validate a correct service match event', () => {
      const event: NostrEvent = {
        id: 'test-id',
        pubkey: 'test-pubkey',
        created_at: Date.now() / 1000,
        kind: 34871,
        content: 'I can help with this',
        tags: [
          ['d', 'match-001'],
          ['a', '30627:pubkey:request-001'],
          ['a', '38857:pubkey:offer-001'],
          ['by', 'matcher-pubkey'],
          ['type', 'offer_to_request'],
        ],
        sig: 'test-sig',
      };

      expect(validateServiceMatchEvent(event)).toBe(true);
    });

    it('should reject match event with wrong kind', () => {
      const event: NostrEvent = {
        id: 'test-id',
        pubkey: 'test-pubkey',
        created_at: Date.now() / 1000,
        kind: 1,
        content: 'Test content',
        tags: [
          ['d', 'match-001'],
          ['a', '30627:pubkey:request-001'],
          ['by', 'matcher-pubkey'],
          ['type', 'offer_to_request'],
        ],
        sig: 'test-sig',
      };

      expect(validateServiceMatchEvent(event)).toBe(false);
    });

    it('should reject match event missing required tags', () => {
      const event: NostrEvent = {
        id: 'test-id',
        pubkey: 'test-pubkey',
        created_at: Date.now() / 1000,
        kind: 34871,
        content: 'Test content',
        tags: [
          ['d', 'match-001'],
          // Missing 'a', 'by', and 'type' tags
        ],
        sig: 'test-sig',
      };

      expect(validateServiceMatchEvent(event)).toBe(false);
    });

    it('should reject match event with invalid type', () => {
      const event: NostrEvent = {
        id: 'test-id',
        pubkey: 'test-pubkey',
        created_at: Date.now() / 1000,
        kind: 34871,
        content: 'Test content',
        tags: [
          ['d', 'match-001'],
          ['a', '30627:pubkey:request-001'],
          ['by', 'matcher-pubkey'],
          ['type', 'invalid-type'],
        ],
        sig: 'test-sig',
      };

      expect(validateServiceMatchEvent(event)).toBe(false);
    });
  });

  describe('extractServiceData', () => {
    it('should extract service data correctly', () => {
      const event: NostrEvent = {
        id: 'test-id',
        pubkey: 'test-pubkey',
        created_at: 1640995200,
        kind: 38857,
        content: 'Lawn mowing service',
        tags: [
          ['d', 'offer-001'],
          ['tribe', 'test-tribe'],
          ['village', 'test-village'],
          ['t', 'yardwork'],
          ['l', '42.3314,-83.0458'],
          ['area', 'Downtown'],
          ['avail', 'weekends'],
          ['rate', '$20/hr'],
          ['radius', '2mi'],
        ],
        sig: 'test-sig',
      };

      const data = extractServiceData(event);

      expect(data).toEqual({
        id: 'test-id',
        pubkey: 'test-pubkey',
        kind: 38857,
        content: 'Lawn mowing service',
        createdAt: 1640995200,
        dTag: 'offer-001',
        tribe: 'test-tribe',
        villages: ['test-village'],
        category: 'yardwork',
        location: '42.3314,-83.0458',
        area: 'Downtown',
        availability: 'weekends',
        timeWindow: undefined,
        rate: '$20/hr',
        radius: '2mi',
        contact: undefined,
        expires: undefined,
      });
    });
  });

  describe('calculateDistance', () => {
    it('should calculate distance between two points', () => {
      // Distance between Detroit and Ann Arbor (approximately 35-40 miles)
      const distance = calculateDistance(42.3314, -83.0458, 42.2808, -83.7430);
      expect(distance).toBeGreaterThan(30);
      expect(distance).toBeLessThan(40);
    });

    it('should return 0 for same coordinates', () => {
      const distance = calculateDistance(42.3314, -83.0458, 42.3314, -83.0458);
      expect(distance).toBe(0);
    });
  });

  describe('formatDistance', () => {
    it('should format very short distances as blocks', () => {
      expect(formatDistance(0.05)).toBe('~1 block');
    });

    it('should format short distances as blocks', () => {
      expect(formatDistance(0.2)).toBe('~3 blocks');
    });

    it('should format medium distances as fractions', () => {
      expect(formatDistance(0.4)).toBe('~½ mile');
      expect(formatDistance(0.7)).toBe('~¾ mile');
    });

    it('should format long distances as miles', () => {
      expect(formatDistance(1)).toBe('~1 mile');
      expect(formatDistance(2.3)).toBe('~2 miles');
      expect(formatDistance(5)).toBe('~5 miles');
    });
  });
});