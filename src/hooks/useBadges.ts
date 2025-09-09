import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import type { NostrEvent } from '@nostrify/nostrify';

// Hook to get badge definitions for a tribe
export function useTribeBadges(tribePubkey: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['tribe-badges', tribePubkey],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(1500)]);

      const events = await nostr.query([
        {
          kinds: [30009], // Badge Definition (NIP-58)
          authors: [tribePubkey],
          limit: 50,
        }
      ], { signal });

      return events.filter(validateBadgeDefinition);
    },
  });
}

// Hook to get badge awards for a user
export function useUserBadgeAwards(userPubkey: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['user-badge-awards', userPubkey],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(1500)]);

      const events = await nostr.query([
        {
          kinds: [8], // Badge Award (NIP-58)
          '#p': [userPubkey],
          limit: 100,
        }
      ], { signal });

      return events.filter(validateBadgeAward);
    },
  });
}

// Hook to get user's profile badges (displayed badges)
export function useUserProfileBadges(userPubkey: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['user-profile-badges', userPubkey],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(1500)]);

      const events = await nostr.query([
        {
          kinds: [30008], // Profile Badges (NIP-58)
          authors: [userPubkey],
          '#d': ['profile_badges'],
          limit: 1,
        }
      ], { signal });

      return events[0] || null;
    },
  });
}

// Hook to get badge awards for a specific event
export function useEventBadgeAwards(eventId: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['event-badge-awards', eventId],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(1500)]);

      const [pubkey, dTag] = eventId.split(':');
      if (!pubkey || !dTag) return [];

      // Find badge awards that reference this event
      const events = await nostr.query([
        {
          kinds: [8], // Badge Award (NIP-58)
          '#t': [`event:${eventId}`], // Custom tag to link badge to event
          limit: 200,
        }
      ], { signal });

      return events.filter(validateBadgeAward);
    },
  });
}

// Hook to get badges for a user (simplified version)
export function useBadges(userPubkey?: string) {
  const awards = useUserBadgeAwards(userPubkey || '');
  return useBadgeData(awards.data || []);
}

// Get combined badge data (definition + awards) for display
export function useBadgeData(badgeAwards: NostrEvent[]) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['badge-data', badgeAwards.map(e => e.id).join(',')],
    queryFn: async (c) => {
      if (badgeAwards.length === 0) return [];

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(1500)]);

      // Extract unique badge definition coordinates from awards
      const badgeCoords = Array.from(new Set(
        badgeAwards.map(award =>
          award.tags.find(([name]) => name === 'a')?.[1]
        ).filter(Boolean)
      ));

      if (badgeCoords.length === 0) return [];

      // Query for badge definitions
      const filters = badgeCoords.map(coord => {
        const [_kind, pubkey, dTag] = coord!.split(':');
        return {
          kinds: [30009],
          authors: [pubkey],
          '#d': [dTag],
        };
      });

      const definitions = await nostr.query(filters, { signal });

      // Combine definitions with awards
      return badgeAwards.map(award => {
        const aTag = award.tags.find(([name]) => name === 'a')?.[1];
        const definition = definitions.find(def => {
          const defCoord = `30009:${def.pubkey}:${def.tags.find(([name]) => name === 'd')?.[1]}`;
          return defCoord === aTag;
        });

        return {
          award,
          definition,
        };
      }).filter(item => item.definition);
    },
    enabled: badgeAwards.length > 0,
  });
}

// Validate badge definition structure
export function validateBadgeDefinition(event: NostrEvent): boolean {
  if (event.kind !== 30009) return false;

  const dTag = event.tags.find(([name]) => name === 'd')?.[1];
  if (!dTag) return false;

  return true;
}

// Validate badge award structure
export function validateBadgeAward(event: NostrEvent): boolean {
  if (event.kind !== 8) return false;

  const aTag = event.tags.find(([name]) => name === 'a')?.[1];
  const pTags = event.tags.filter(([name]) => name === 'p');

  if (!aTag || pTags.length === 0) return false;

  return true;
}