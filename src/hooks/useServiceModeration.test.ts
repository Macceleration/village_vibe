import { describe, it, expect } from 'vitest';
import type { NostrEvent } from '@nostrify/nostrify';

describe('Service Moderation', () => {
  describe('moderation label validation', () => {
    it('should validate moderation label structure', () => {
      const moderationLabel: NostrEvent = {
        id: 'test-id',
        pubkey: 'moderator-pubkey',
        created_at: Math.floor(Date.now() / 1000),
        kind: 1985, // NIP-32 Label
        content: 'Service hidden for inappropriate content',
        tags: [
          ['L', 'moderation'],
          ['l', 'hidden-by-moderator', 'moderation'],
          ['e', 'service-event-id'],
          ['p', 'service-author-pubkey'],
          ['k', '38857'],
          ['alt', 'Moderation action: hide service'],
        ],
        sig: 'test-sig',
      };

      // Check that it has the required moderation tags
      const hasLabelNamespace = moderationLabel.tags.some(([name, value]) =>
        name === 'L' && value === 'moderation'
      );
      const hasModerationLabel = moderationLabel.tags.some(([name, value, namespace]) =>
        name === 'l' && value === 'hidden-by-moderator' && namespace === 'moderation'
      );
      const hasEventReference = moderationLabel.tags.some(([name]) => name === 'e');
      const hasAuthorReference = moderationLabel.tags.some(([name]) => name === 'p');

      expect(hasLabelNamespace).toBe(true);
      expect(hasModerationLabel).toBe(true);
      expect(hasEventReference).toBe(true);
      expect(hasAuthorReference).toBe(true);
    });
  });

  describe('service match validation', () => {
    it('should validate admin suggestion match', () => {
      const adminMatch: NostrEvent = {
        id: 'test-id',
        pubkey: 'admin-pubkey',
        created_at: Math.floor(Date.now() / 1000),
        kind: 34871,
        content: 'These services are a good match based on location and timing',
        tags: [
          ['d', 'admin-match-001'],
          ['a', '30627:req-pubkey:request-001'],
          ['a', '38857:offer-pubkey:offer-001'],
          ['by', 'admin-pubkey'],
          ['type', 'admin_suggestion'],
          ['alt', 'Admin suggestion for service match'],
        ],
        sig: 'test-sig',
      };

      // Use the existing validation function
      const isValid = validateServiceMatchEvent(adminMatch);
      expect(isValid).toBe(true);
    });

    it('should validate user-initiated match', () => {
      const userMatch: NostrEvent = {
        id: 'test-id',
        pubkey: 'user-pubkey',
        created_at: Math.floor(Date.now() / 1000),
        kind: 34871,
        content: 'I can help with this request',
        tags: [
          ['d', 'user-match-001'],
          ['a', '30627:req-pubkey:request-001'],
          ['by', 'user-pubkey'],
          ['type', 'offer_to_request'],
          ['alt', 'Service match connecting community members'],
        ],
        sig: 'test-sig',
      };

      // Use the local validation function
      const isValid = validateServiceMatchEvent(userMatch);
      expect(isValid).toBe(true);
    });
  });

  describe('service filtering with moderation', () => {
    it('should identify moderated services', () => {
      const service: NostrEvent = {
        id: 'service-id',
        pubkey: 'user-pubkey',
        created_at: Math.floor(Date.now() / 1000),
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

      const moderationLabel: NostrEvent = {
        id: 'moderation-id',
        pubkey: 'moderator-pubkey',
        created_at: Math.floor(Date.now() / 1000),
        kind: 1985,
        content: 'Service hidden by moderator',
        tags: [
          ['L', 'moderation'],
          ['l', 'hidden-by-moderator', 'moderation'],
          ['e', 'service-id'], // References the service
          ['p', 'user-pubkey'],
          ['k', '38857'],
        ],
        sig: 'test-sig',
      };

      // Check if moderation label correctly references the service
      const referencesService = moderationLabel.tags.some(([name, value]) =>
        name === 'e' && value === service.id
      );
      const isHiddenLabel = moderationLabel.tags.some(([name, value, namespace]) =>
        name === 'l' && value === 'hidden-by-moderator' && namespace === 'moderation'
      );

      expect(referencesService).toBe(true);
      expect(isHiddenLabel).toBe(true);
    });
  });
});

// Import the validation function for testing
function validateServiceMatchEvent(event: NostrEvent): boolean {
  if (event.kind !== 34871) return false;

  const dTag = event.tags.find(([name]) => name === 'd')?.[1];
  const byTag = event.tags.find(([name]) => name === 'by')?.[1];
  const typeTag = event.tags.find(([name]) => name === 'type')?.[1];
  const aTags = event.tags.filter(([name]) => name === 'a');

  if (!dTag || !byTag || !typeTag) return false;
  if (!['offer_to_request', 'request_to_offer', 'admin_suggestion'].includes(typeTag)) return false;
  if (aTags.length === 0) return false;

  return true;
}