import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import type { NostrEvent } from '@nostrify/nostrify';

// Hook to get tribes (communities) that the user belongs to
export function useMyTribes(pubkey?: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['my-tribes', pubkey],
    queryFn: async (c) => {
      if (!pubkey) return [];

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);

      // Query for community definitions where user is a moderator/member
      const events = await nostr.query([
        {
          kinds: [34550], // Community Definition (NIP-72)
          '#p': [pubkey],
          limit: 50,
        }
      ], { signal });

      return events;
    },
    enabled: !!pubkey,
  });
}

// Hook to get all public tribes
export function usePublicTribes() {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['public-tribes'],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);

      const events = await nostr.query([
        {
          kinds: [34550], // Community Definition (NIP-72)
          '#t': ['tribe'], // Filter for tribe communities
          limit: 50,
        }
      ], { signal });

      return events;
    },
  });
}

// Hook to get a specific tribe by its coordinates
export function useTribe(tribeId: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['tribe', tribeId],
    retry: 5, // Retry 5 times for maximum reliability
    retryDelay: (attemptIndex) => {
      // Very aggressive retry schedule: 250ms, 500ms, 1s, 2s, 4s
      return Math.min(250 * 2 ** attemptIndex, 10000);
    },
    staleTime: 0, // Always fetch fresh data
    gcTime: 1000 * 60, // Keep in cache for 1 minute
    refetchOnMount: true, // Always refetch on mount
    refetchOnReconnect: true, // Refetch when reconnecting
    refetchOnWindowFocus: false, // Don't refetch on window focus
    networkMode: 'always', // Don't pause queries when offline
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(15000)]); // Increased to 15s

      // Parse tribe coordinates (format: pubkey:d-identifier)
      const [pubkey, dTag] = tribeId.split(':');
      if (!pubkey || !dTag) {
        throw new Error('Invalid tribe ID format');
      }

      console.log('🔍 Querying tribe:', { tribeId, pubkey: pubkey.slice(0, 8), dTag });

      try {
        // Use a longer timeout for better reliability with slow relays
        const extendedSignal = AbortSignal.any([c.signal, AbortSignal.timeout(20000)]); // 20s instead of 15s

        const events = await nostr.query([
          {
            kinds: [34550],
            authors: [pubkey],
            '#d': [dTag],
            limit: 10, // Increased limit in case relay returns multiple versions
          }
        ], { signal: extendedSignal });

        console.log('📦 Tribe query result:', {
          found: events.length > 0,
          count: events.length,
          eventId: events[0]?.id.slice(0, 8)
        });

        // If no tribe found, throw error to trigger retry
        if (events.length === 0) {
          console.warn('⚠️ Tribe not found on any relay, will retry');
          throw new Error(`Tribe not found: ${tribeId}`);
        }

        // If multiple versions found, return the newest one
        if (events.length > 1) {
          events.sort((a, b) => b.created_at - a.created_at);
          console.log('📌 Multiple tribe versions found, using newest:', events[0].created_at);
        }

        console.log('✅ Tribe found successfully');
        return events[0];
      } catch (err) {
        console.error('❌ Tribe query error:', err);
        throw err;
      }
    },
  });
}

// Hook to get join requests for a tribe (for checking if user already requested)
export function useTribeJoinRequests(tribeId: string, userPubkey?: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['tribe-join-requests', tribeId, userPubkey],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);

      const filter: {
        kinds: number[];
        '#h': string[];
        limit: number;
        authors?: string[];
      } = {
        kinds: [9021], // Join request (NIP-29)
        '#h': [tribeId],
        limit: 100,
      };

      // If checking for specific user, filter by author
      if (userPubkey) {
        filter.authors = [userPubkey];
      }

      // Get join requests and rejections
      const [requests, rejections] = await Promise.all([
        nostr.query([filter], { signal }),
        nostr.query([
          {
            kinds: [9022], // Join rejection (custom kind)
            '#h': [tribeId],
            authors: userPubkey ? [userPubkey] : undefined,
            '#p': userPubkey ? [userPubkey] : undefined,
            limit: 10,
          }
        ], { signal })
      ]);

      // If user has been rejected, don't show any pending requests
      if (userPubkey && rejections.length > 0) {
        return [];
      }

      return requests.sort((a, b) => b.created_at - a.created_at);
    },
    enabled: !!tribeId,
  });
}

// Hook to get member count for a tribe by fetching fresh data
export function useTribeMemberCount(tribeId: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['tribe-member-count', tribeId],
    queryFn: async (c) => {
      if (!tribeId) return 0;

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);

      // Parse tribe coordinates (format: pubkey:d-identifier)
      const [pubkey, dTag] = tribeId.split(':');
      if (!pubkey || !dTag) {
        return 0;
      }

      const events = await nostr.query([
        {
          kinds: [34550],
          authors: [pubkey],
          '#d': [dTag],
          limit: 1,
        }
      ], { signal });

      const tribe = events[0];
      if (!tribe) return 0;

      return getUniqueMemberCount(tribe);
    },
    enabled: !!tribeId,
    staleTime: 30000, // Cache for 30 seconds
  });
}

// Helper function to count unique members from p tags
function getUniqueMemberCount(tribe: NostrEvent): number {
  const memberPubkeys = new Set();

  // Count unique pubkeys from p tags (members, moderators, admins, etc.)
  tribe.tags.forEach(([name, pubkey]) => {
    if (name === 'p' && pubkey) {
      memberPubkeys.add(pubkey);
    }
  });

  return memberPubkeys.size;
}

// Hook to get tribe name from tribe tag value
export function useTribeName(tribeTag?: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['tribe-name', tribeTag],
    queryFn: async (c) => {
      if (!tribeTag) return null;

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);

      // Query for community definitions with this d tag
      const events = await nostr.query([
        {
          kinds: [34550], // Community Definition (NIP-72)
          '#d': [tribeTag],
          limit: 10,
        }
      ], { signal });

      if (events.length === 0) return null;

      // Return the first valid tribe event
      const tribe = events.find(validateTribeEvent);
      if (!tribe) return null;

      // Extract tribe name
      const name = tribe.tags.find(([name]) => name === 'name')?.[1] || tribeTag;
      return {
        name,
        tribe,
      };
    },
    enabled: !!tribeTag,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

// Helper function to extract tribe name from event
export function extractTribeName(event: NostrEvent): string {
  const tribeTag = event.tags.find(([name]) => name === 'tribe')?.[1];
  return tribeTag || 'Unknown Tribe';
}

// Validate tribe event structure
export function validateTribeEvent(event: NostrEvent): boolean {
  if (event.kind !== 34550) return false;

  const dTag = event.tags.find(([name]) => name === 'd')?.[1];
  const _nameTag = event.tags.find(([name]) => name === 'name')?.[1];

  // Must have d tag and either name tag or use d tag as name
  if (!dTag) return false;

  return true;
}