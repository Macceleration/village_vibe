import { useNostr } from '@nostrify/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { NostrEvent } from '@nostrify/nostrify';
import { useVillagePreferences } from './useVillagePreferences';

// Hook to get events for a specific tribe
export function useTribeEvents(tribeId: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['tribe-events', tribeId],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(1500)]);

      // Parse tribe coordinates
      const [pubkey, dTag] = tribeId.split(':');
      if (!pubkey || !dTag) return [];

      // Query for calendar events that reference this tribe
      const events = await nostr.query([
        {
          kinds: [31923], // Time-based calendar events (NIP-52)
          '#a': [`34550:${pubkey}:${dTag}`], // Reference to tribe
          limit: 100,
        }
      ], { signal });

      return events.filter(validateCalendarEvent);
    },
  });
}

// Hook to get a specific event
export function useEvent(eventId: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['event', eventId],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(1500)]);

      // Parse event coordinates (format: pubkey:d-identifier)
      const [pubkey, dTag] = eventId.split(':');
      if (!pubkey || !dTag) {
        throw new Error('Invalid event ID format');
      }

      const events = await nostr.query([
        {
          kinds: [31923],
          authors: [pubkey],
          '#d': [dTag],
          limit: 1,
        }
      ], { signal });

      const event = events[0];
      return event && validateCalendarEvent(event) ? event : null;
    },
  });
}

// Hook to get RSVPs for an event
export function useEventRSVPs(eventId: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['event-rsvps', eventId],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(1500)]);

      const [pubkey, dTag] = eventId.split(':');
      if (!pubkey || !dTag) return [];

      const events = await nostr.query([
        {
          kinds: [31925], // Calendar Event RSVP (NIP-52)
          '#a': [`31923:${pubkey}:${dTag}`],
          limit: 200,
        }
      ], { signal });

      return events.filter(validateRSVPEvent);
    },
  });
}

// Hook to get attendance verifications for an event
export function useEventAttendance(eventId: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['event-attendance', eventId],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(1500)]);

      const [pubkey, dTag] = eventId.split(':');
      if (!pubkey || !dTag) return [];

      const events = await nostr.query([
        {
          kinds: [2073], // Custom attendance verification kind
          '#a': [`31923:${pubkey}:${dTag}`],
          limit: 200,
        }
      ], { signal });

      return events.filter(validateAttendanceEvent);
    },
  });
}

// Hook to get user's RSVP for a specific event
export function useUserRSVP(eventId: string, userPubkey?: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['user-rsvp', eventId, userPubkey],
    queryFn: async (c) => {
      if (!userPubkey) return null;

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(1500)]);

      const [pubkey, dTag] = eventId.split(':');
      if (!pubkey || !dTag) return null;

      const events = await nostr.query([
        {
          kinds: [31925],
          authors: [userPubkey],
          '#a': [`31923:${pubkey}:${dTag}`],
          limit: 1,
        }
      ], { signal });

      const rsvp = events[0];
      return rsvp && validateRSVPEvent(rsvp) ? rsvp : null;
    },
    enabled: !!userPubkey,
  });
}

// Hook to get events by village
export function useVillageEvents(villageSlug: string, filters: { search?: string; limit?: number } = {}) {
  const { nostr } = useNostr();
  const { preferences } = useVillagePreferences();

  return useQuery({
    queryKey: ['village-events', villageSlug, filters],
    staleTime: 30000, // Consider data fresh for 30 seconds
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(1500)]);

      console.log('🏘️ Querying village events for:', villageSlug);

      let villageEvents: NostrEvent[] = [];

      // Strategy 1: Try to query with village tag filter first (more efficient if relay supports it)
      if (villageSlug !== 'main') {
        try {
          console.log('🔍 Trying relay-level village filter for events:', villageSlug);
          villageEvents = await nostr.query([{
            kinds: [31923], // Time-based calendar events (NIP-52)
            '#village': [villageSlug],
            limit: filters.limit || 100,
          }], { signal });
          console.log('📦 Found events via relay filter:', villageEvents.length);
        } catch {
          console.log('⚠️ Relay-level village filter failed, falling back to client-side filtering');
        }
      }

      // Strategy 2: If relay filtering didn't work or for main village, use client-side filtering
      if (villageEvents.length === 0 || villageSlug === 'main') {
        console.log('🔍 Using client-side filtering for village events');

        // Get all events and filter client-side
        const allEvents = await nostr.query([{
          kinds: [31923], // Time-based calendar events (NIP-52)
          limit: filters.limit || 200, // Increase limit for client-side filtering
        }], { signal });

        console.log('📦 Found all events for client-side filtering:', allEvents.length);

        // Filter for events that have village tags
        villageEvents = allEvents.filter(event => {
          const villageTags = event.tags.filter(([name]) => name === 'village');

          if (villageSlug === 'main') {
            // For main village page, show all village content
            return villageTags.length > 0;
          } else {
            // For specific village pages, filter by that village
            return villageTags.some(([, value]) => value === villageSlug);
          }
        });

        console.log('🏘️ Events with village tag (client-side):', villageEvents.length);
      }

      // Strategy 3: Also query for events with promotion labels and merge them
      try {
        console.log('🔍 Querying promotion labels for village events:', villageSlug);
        const promotionLabels = await nostr.query([{
          kinds: [1985], // Labels
          '#l': ['village-promoted'],
          limit: 100,
        }], { signal });

        console.log('📋 Found promotion labels:', promotionLabels.length);

        // Extract event references from promotion labels
        const promotedEventRefs = promotionLabels
          .map(label => label.tags.find(([name]) => name === 'a')?.[1])
          .filter((ref): ref is string => Boolean(ref))
          .filter(ref => ref.startsWith('31923:'));

        if (promotedEventRefs.length > 0) {
          console.log('📚 Found promoted event references:', promotedEventRefs.length);

          // Query the actual promoted events
          const promotedEvents = await nostr.query([{
            kinds: [31923],
            limit: 200,
          }], { signal });

          // Filter promoted events and merge with village events
          const matchingPromotedEvents = promotedEvents.filter(event => {
            const eventRef = `31923:${event.pubkey}:${event.tags.find(([name]) => name === 'd')?.[1]}`;
            return promotedEventRefs.includes(eventRef);
          });

          console.log('✨ Found matching promoted events:', matchingPromotedEvents.length);

          // Merge with existing village events (avoid duplicates)
          const existingIds = new Set(villageEvents.map(e => e.id));
          const newPromotedEvents = matchingPromotedEvents.filter(event => !existingIds.has(event.id));
          villageEvents = [...villageEvents, ...newPromotedEvents];

          console.log('🔄 Merged promoted events, total:', villageEvents.length);
        }
      } catch (err) {
        console.log('⚠️ Failed to query promotion labels:', err);
      }

      // Apply additional filters
      let filteredEvents = villageEvents;

      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredEvents = filteredEvents.filter(event => {
          const title = event.tags.find(([name]) => name === 'title')?.[1] || '';
          const summary = event.tags.find(([name]) => name === 'summary')?.[1] || '';
          return title.toLowerCase().includes(searchLower) ||
                 summary.toLowerCase().includes(searchLower) ||
                 event.content.toLowerCase().includes(searchLower);
        });
      }

      const validEvents = filteredEvents.filter(validateCalendarEvent);
      console.log('✅ Valid village events after all strategies:', validEvents.length);

      // Filter out events from hidden tribes
      const nonHiddenEvents = validEvents.filter(event => {
        const tribeTag = event.tags.find(([name]) => name === 'tribe')?.[1];
        return !tribeTag || !preferences.hiddenTribes.includes(tribeTag);
      });

      console.log('🚫 After filtering hidden tribes:', nonHiddenEvents.length);

      // Sort by start time (upcoming events first)
      return nonHiddenEvents.sort((a, b) => {
        const startA = parseInt(a.tags.find(([name]) => name === 'start')?.[1] || '0');
        const startB = parseInt(b.tags.find(([name]) => name === 'start')?.[1] || '0');
        return startA - startB;
      });
    },
  });
}

// Hook to promote an event to villages (creates label AND updates event with village tags)
export function usePromoteEventToVillages() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      event: NostrEvent;
      villages: string[];
      reason?: string;
    }) => {
      const { event, villages, reason } = data;

      // Parse event data
      const dTag = event.tags.find(([name]) => name === 'd')?.[1];
      if (!dTag) {
        throw new Error('Event missing d tag');
      }

      const eventId = `${event.pubkey}:${dTag}`;

      // Get existing village tags
      const existingVillageTags = event.tags.filter(([name]) => name === 'village').map(([, value]) => value);
      const newVillages = villages.filter(v => !existingVillageTags.includes(v));
      const allVillages = [...existingVillageTags, ...newVillages];

      // Create updated event with village tags
      const updatedTags = [
        ...event.tags.filter(([name]) => name !== 'village'), // Remove existing village tags
        ...allVillages.map(village => ['village', village]), // Add all village tags
      ];

      const updatedEvent = {
        kind: 31923,
        content: event.content,
        tags: updatedTags,
        created_at: Math.floor(Date.now() / 1000),
      };

      // Create promotion label
      const labelTags: string[][] = [
        ['a', `31923:${event.pubkey}:${dTag}`],
        ['l', 'village-promoted', 'promotion'],
        ['L', 'promotion'],
        ['alt', `Event promoted to villages: ${villages.join(', ')}`],
      ];

      // Add village context to label
      villages.forEach(village => {
        labelTags.push(['village', village]);
      });

      const promotionLabel = {
        kind: 1985,
        content: reason || `Promoted to ${villages.join(', ')}`,
        tags: labelTags,
        created_at: Math.floor(Date.now() / 1000),
      };

      return {
        eventId,
        updatedEvent,
        promotionLabel,
        villages: allVillages,
      };
    },
    onSuccess: (result) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: ['event', result.eventId]
      });
      queryClient.invalidateQueries({
        queryKey: ['tribe-events']
      });
      queryClient.invalidateQueries({
        queryKey: ['village-events']
      });

      // Invalidate specific village queries
      result.villages.forEach(village => {
        queryClient.invalidateQueries({
          queryKey: ['village-events', village]
        });
      });
    },
  });
}

// Hook to create an event label (for moderation)
export function useCreateEventLabel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      eventId: string;
      label: string;
      namespace?: string;
      content?: string;
    }) => {
      // Parse event coordinates
      const [pubkey, dTag] = data.eventId.split(':');
      if (!pubkey || !dTag) {
        throw new Error('Invalid event ID format');
      }

      // Build tags array
      const tags: string[][] = [
        ['a', `31923:${pubkey}:${dTag}`],
        ['l', data.label, data.namespace || 'ugc'],
        ['alt', `Event moderation label: ${data.label}`],
      ];

      // Add namespace tag if provided
      if (data.namespace) {
        tags.push(['L', data.namespace]);
      }

      // Create the event
      const eventData = {
        kind: 1985,
        content: data.content || '',
        tags,
        created_at: Math.floor(Date.now() / 1000),
      };

      // Note: This will be published using useNostrPublish in the component
      return { ...data, eventData };
    },
    onSuccess: (_, variables) => {
      // Invalidate labels for this event
      queryClient.invalidateQueries({
        queryKey: ['event-labels', variables.eventId]
      });

      // If this is a village promotion, invalidate village events
      if (variables.label === 'village-promoted') {
        queryClient.invalidateQueries({
          queryKey: ['village-events']
        });
      }
    },
  });
}

// Validate calendar event structure
export function validateCalendarEvent(event: NostrEvent): boolean {
  if (event.kind !== 31923) return false;

  const dTag = event.tags.find(([name]) => name === 'd')?.[1];
  const titleTag = event.tags.find(([name]) => name === 'title')?.[1];
  const startTag = event.tags.find(([name]) => name === 'start')?.[1];

  if (!dTag || !titleTag || !startTag) return false;

  // Validate start timestamp
  const timestamp = parseInt(startTag);
  if (isNaN(timestamp) || timestamp <= 0) return false;

  return true;
}

// Validate RSVP event structure
export function validateRSVPEvent(event: NostrEvent): boolean {
  if (event.kind !== 31925) return false;

  const dTag = event.tags.find(([name]) => name === 'd')?.[1];
  const aTag = event.tags.find(([name]) => name === 'a')?.[1];
  const statusTag = event.tags.find(([name]) => name === 'status')?.[1];

  if (!dTag || !aTag || !statusTag) return false;
  if (!['accepted', 'declined', 'tentative'].includes(statusTag)) return false;

  return true;
}

// Validate attendance event structure
export function validateAttendanceEvent(event: NostrEvent): boolean {
  if (event.kind !== 2073) return false;

  const aTag = event.tags.find(([name]) => name === 'a')?.[1];
  const nonceTag = event.tags.find(([name]) => name === 'nonce')?.[1];
  const verifiedAtTag = event.tags.find(([name]) => name === 'verified_at')?.[1];

  if (!aTag || !nonceTag || !verifiedAtTag) return false;

  return true;
}