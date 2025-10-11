import { useNostr } from '@nostrify/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { NostrEvent } from '@nostrify/nostrify';
import { useVillagePreferences } from './useVillagePreferences';
import { useCurrentUser } from './useCurrentUser';

// Event types for multi-type support (whitelisted values)
export const EVENT_TYPES = [
  'meetup',
  'gathering',
  'potluck',
  'trivia',
  'game',
  'service-day',
  'cleanup',
  'workshop',
  'skill-swap',
  'celebration',
  'ritual',
  'market',
  'swap',
  'freebie-fair',
  'mixer',
  'matchmaking',
  'council',
  'tribe-meeting'
] as const;

export type EventType = typeof EVENT_TYPES[number];

// Event visibility levels
export type EventVisibility = 'public' | 'tribe-only' | 'private';

// Event filter options
export interface EventFilters {
  etypes?: EventType[];
  visibility?: EventVisibility[];
  dateFrom?: string;
  dateTo?: string;
  distance?: string;
  village?: string;
  search?: string;
  showPrivateInvited?: boolean;
  limit?: number;
}

// Hook to get events for a specific tribe
export function useTribeEvents(tribeId: string, filters: EventFilters = {}) {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();

  return useQuery({
    queryKey: ['tribe-events', tribeId, filters],
    staleTime: 30000,
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(1500)]);

      // Parse tribe coordinates
      const [pubkey, dTag] = tribeId.split(':');
      if (!pubkey || !dTag) {
        console.log('🔍 Invalid tribe ID format:', tribeId);
        return [];
      }

      console.log('🔍 Querying events for tribe:', { tribeId, pubkey, dTag });

      let enhancedEvents: NostrEvent[] = [];
      let legacyEvents: NostrEvent[] = [];

      // Query all enhanced events by author and filter client-side
      // (Relay doesn't index custom tags like 'tribe')
      try {
        console.log('📡 Querying all events by tribe author:', pubkey.slice(0, 8));
        const allEnhancedEvents = await nostr.query([
          {
            kinds: [36959], // Enhanced events
            authors: [pubkey], // Query by tribe owner
            limit: filters.limit || 200,
          }
        ], { signal });
        console.log('📦 All enhanced events by author:', allEnhancedEvents.length);

        // Filter for events with matching tribe tag
        enhancedEvents = allEnhancedEvents.filter(event => {
          const tribeTags = event.tags.filter(([name]) => name === 'tribe');
          return tribeTags.some(([, value]) => value === dTag || value === tribeId);
        });
        console.log('📦 Enhanced events matching tribe tag:', enhancedEvents.length);
      } catch (err) {
        console.log('⚠️ Enhanced events query failed:', err);
      }

      // Query legacy events by author (relays don't index #a tags reliably)
      try {
        const legacyEventsByAuthor = await nostr.query([
          {
            kinds: [31923], // Time-based calendar events (NIP-52)
            authors: [pubkey],
            limit: 100,
          }
        ], { signal });
        console.log('📦 Legacy events (by author):', legacyEventsByAuthor.length);

        // Filter for events that reference this tribe
        legacyEvents = legacyEventsByAuthor.filter(event => {
          // Check if event has any reference to the tribe
          return event.tags.some(([name, value]) =>
            (name === 'a' && value === `34550:${pubkey}:${dTag}`) ||
            (name === 'tribe' && (value === dTag || value === tribeId))
          );
        });
        console.log('📦 Legacy events (filtered for tribe):', legacyEvents.length);
      } catch (err) {
        console.log('⚠️ Legacy events query failed:', err);
      }

      // Combine and validate events
      const allEvents = [...enhancedEvents, ...legacyEvents];
      let validEvents = allEvents.filter(event =>
        event.kind === 36959 ? validateEnhancedEvent(event) : validateCalendarEvent(event)
      );

      console.log('✅ Valid events:', validEvents.length);

      // Apply filters
      validEvents = applyEventFilters(validEvents, filters, user?.pubkey);

      console.log('🎯 After filters:', validEvents.length);

      // Sort by start time (upcoming events first)
      return validEvents.sort((a, b) => {
        const startA = parseInt(a.tags.find(([name]) => name === 'start')?.[1] || '0');
        const startB = parseInt(b.tags.find(([name]) => name === 'start')?.[1] || '0');
        return startA - startB;
      });
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

      // Try enhanced events first
      let events = await nostr.query([
        {
          kinds: [36959],
          authors: [pubkey],
          '#d': [dTag],
          limit: 1,
        }
      ], { signal });

      let event = events[0];
      if (event && validateEnhancedEvent(event)) {
        return event;
      }

      // Fallback to legacy calendar events
      events = await nostr.query([
        {
          kinds: [31923],
          authors: [pubkey],
          '#d': [dTag],
          limit: 1,
        }
      ], { signal });

      event = events[0];
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

      // Query RSVPs for both enhanced and legacy events
      const enhancedRSVPs = await nostr.query([
        {
          kinds: [31925], // Calendar Event RSVP (NIP-52)
          '#a': [`36959:${pubkey}:${dTag}`],
          limit: 200,
        }
      ], { signal });

      const legacyRSVPs = await nostr.query([
        {
          kinds: [31925], // Calendar Event RSVP (NIP-52)
          '#a': [`31923:${pubkey}:${dTag}`],
          limit: 200,
        }
      ], { signal });

      const allRSVPs = [...enhancedRSVPs, ...legacyRSVPs];
      return allRSVPs.filter(validateRSVPEvent);
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

      // Try enhanced events first
      let events = await nostr.query([
        {
          kinds: [31925],
          authors: [userPubkey],
          '#a': [`36959:${pubkey}:${dTag}`],
          limit: 1,
        }
      ], { signal });

      let rsvp = events[0];
      if (rsvp && validateRSVPEvent(rsvp)) {
        return rsvp;
      }

      // Fallback to legacy events
      events = await nostr.query([
        {
          kinds: [31925],
          authors: [userPubkey],
          '#a': [`31923:${pubkey}:${dTag}`],
          limit: 1,
        }
      ], { signal });

      rsvp = events[0];
      return rsvp && validateRSVPEvent(rsvp) ? rsvp : null;
    },
    enabled: !!userPubkey,
  });
}

// Hook to get events by village
export function useVillageEvents(villageSlug: string, filters: EventFilters = {}) {
  const { nostr } = useNostr();
  const { preferences } = useVillagePreferences();
  const { user } = useCurrentUser();

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

          // Query enhanced events
          const enhancedEvents = await nostr.query([{
            kinds: [36959], // Enhanced events
            '#village': [villageSlug],
            limit: filters.limit || 100,
          }], { signal });

          // Query legacy events for backward compatibility
          const legacyEvents = await nostr.query([{
            kinds: [31923], // Time-based calendar events (NIP-52)
            '#village': [villageSlug],
            limit: 50,
          }], { signal });

          villageEvents = [...enhancedEvents, ...legacyEvents];
          console.log('📦 Found events via relay filter:', villageEvents.length);
        } catch {
          console.log('⚠️ Relay-level village filter failed, falling back to client-side filtering');
        }
      }

      // Strategy 2: If relay filtering didn't work or for main village, use client-side filtering
      if (villageEvents.length === 0 || villageSlug === 'main') {
        console.log('🔍 Using client-side filtering for village events');

        // Get all events and filter client-side
        const enhancedEvents = await nostr.query([{
          kinds: [36959], // Enhanced events
          limit: filters.limit || 150,
        }], { signal });

        const legacyEvents = await nostr.query([{
          kinds: [31923], // Time-based calendar events (NIP-52)
          limit: 50,
        }], { signal });

        const allEvents = [...enhancedEvents, ...legacyEvents];
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
          .filter(ref => ref.startsWith('36959:') || ref.startsWith('31923:'));

        if (promotedEventRefs.length > 0) {
          console.log('📚 Found promoted event references:', promotedEventRefs.length);

          // Query the actual promoted events
          const promotedEvents = await nostr.query([{
            kinds: [36959, 31923],
            limit: 200,
          }], { signal });

          // Filter promoted events and merge with village events
          const matchingPromotedEvents = promotedEvents.filter(event => {
            const eventRef = `${event.kind}:${event.pubkey}:${event.tags.find(([name]) => name === 'd')?.[1]}`;
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

      // Validate events
      const validEvents = villageEvents.filter(event =>
        event.kind === 36959 ? validateEnhancedEvent(event) : validateCalendarEvent(event)
      );
      console.log('✅ Valid village events after all strategies:', validEvents.length);

      // Apply filters
      let filteredEvents = applyEventFilters(validEvents, filters, user?.pubkey);

      // Filter out events from hidden tribes
      filteredEvents = filteredEvents.filter(event => {
        const tribeTag = event.tags.find(([name]) => name === 'tribe')?.[1];
        return !tribeTag || !preferences.hiddenTribes.includes(tribeTag);
      });

      console.log('🚫 After filtering hidden tribes:', filteredEvents.length);

      // Sort by start time (upcoming events first)
      return filteredEvents.sort((a, b) => {
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

// Hook to create or update an enhanced event
export function useCreateEnhancedEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      tribe: string;
      title: string;
      content: string;
      start: number;
      end?: number;
      place: string;
      lat: number;
      lon: number;
      etypes: EventType[];
      visibility: EventVisibility;
      villages?: string[];
      invitees?: string[];
      privateDetails?: string;
      typeSpecificData?: Record<string, string | string[]>;
      dTag?: string; // For updates
    }) => {
      // Generate a unique d tag if not provided (for updates)
      const dTag = data.dTag || `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Parse tribeId to determine tribe tag format
      // If tribe is in format "pubkey:dTag", use dTag part for tribe tag
      // If tribe is just dTag, use it as-is
      const tribeTagValue = data.tribe.includes(':') ? data.tribe.split(':')[1] : data.tribe;

      // Build tags array
      const tags: string[][] = [
        ['d', dTag],
        ['tribe', tribeTagValue], // Use dTag part for tribe tag
        ['title', data.title],
        ['start', data.start.toString()],
        ['place', data.place],
        ['l', `${data.lat.toFixed(4)},${data.lon.toFixed(4)}`], // Round for privacy
        ['visibility', data.visibility],
        ['alt', 'Community event for local participation'],
      ];

      // Add end time if provided
      if (data.end) {
        tags.push(['end', data.end.toString()]);
      }

      // Add event types
      data.etypes.forEach(etype => {
        tags.push(['etype', etype]);
      });

      // Add village tags
      if (data.villages && data.villages.length > 0) {
        data.villages.forEach(village => {
          tags.push(['village', village]);
        });
      }

      // Add invitees for private events
      if (data.visibility === 'private' && data.invitees && data.invitees.length > 0) {
        data.invitees.forEach(invitee => {
          tags.push(['p', invitee]);
        });
      }

      // Add type-specific tags
      if (data.typeSpecificData) {
        Object.entries(data.typeSpecificData).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            value.forEach(v => tags.push([key, v]));
          } else {
            tags.push([key, value]);
          }
        });
      }

      // Create the event
      const eventData = {
        kind: 36959,
        content: data.content,
        tags,
        created_at: Math.floor(Date.now() / 1000),
      };

      return {
        ...data,
        dTag,
        eventData,
        eventId: `${eventData.created_at}:${dTag}` // Temporary ID for UI
      };
    },
    onSuccess: (result, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: ['tribe-events']
      });
      queryClient.invalidateQueries({
        queryKey: ['village-events']
      });

      // Invalidate tribe-specific query using full tribeId
      queryClient.invalidateQueries({
        queryKey: ['tribe-events', variables.tribe]
      });

      if (variables.villages) {
        variables.villages.forEach(village => {
          queryClient.invalidateQueries({
            queryKey: ['village-events', village]
          });
        });
      }
    },
  });
}

// Hook to send private event details via DM
export function useSendPrivateEventDetails() {
  return useMutation({
    mutationFn: async (data: {
      eventId: string;
      eventTitle: string;
      invitees: string[];
      privateDetails: string;
      exactLocation?: string;
      organizer: string;
    }) => {
      const dmContent = `🔒 Private Event Details: ${data.eventTitle}

${data.privateDetails}

${data.exactLocation ? `📍 Exact Location: ${data.exactLocation}` : ''}

Event ID: ${data.eventId}
Organizer: ${data.organizer}

This is a private event. Please don't share these details publicly.`;

      // Return DM data for each invitee (to be sent via useNostrPublish)
      return data.invitees.map(invitee => ({
        kind: 4, // Encrypted Direct Message (NIP-04)
        content: dmContent,
        tags: [
          ['p', invitee],
          ['alt', `Private event details for ${data.eventTitle}`],
        ],
        invitee,
      }));
    },
  });
}

// Hook to create an event label (for moderation)
export function useCreateEventLabel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      eventId: string;
      eventKind: 36959 | 31923;
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
        ['a', `${data.eventKind}:${pubkey}:${dTag}`],
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

// Validate enhanced event structure
export function validateEnhancedEvent(event: NostrEvent): boolean {
  if (event.kind !== 36959) return false;

  const dTag = event.tags.find(([name]) => name === 'd')?.[1];
  const tribeTag = event.tags.find(([name]) => name === 'tribe')?.[1];
  const titleTag = event.tags.find(([name]) => name === 'title')?.[1];
  const startTag = event.tags.find(([name]) => name === 'start')?.[1];
  const placeTag = event.tags.find(([name]) => name === 'place')?.[1];
  const locationTag = event.tags.find(([name]) => name === 'l')?.[1];

  // Required tags
  if (!dTag || !tribeTag || !titleTag || !startTag || !placeTag || !locationTag) return false;

  // Validate start timestamp
  const timestamp = parseInt(startTag);
  if (isNaN(timestamp) || timestamp <= 0) return false;

  // Validate location format (lat,lon)
  const locationParts = locationTag.split(',');
  if (locationParts.length !== 2) return false;

  const [lat, lon] = locationParts.map(Number);
  if (isNaN(lat) || isNaN(lon)) return false;

  // Validate event types (OPTIONAL for backward compatibility with old events)
  const etypeTags = event.tags.filter(([name]) => name === 'etype');
  if (etypeTags.length > 0) {
    // If event has etype tags, validate them
    for (const [, etype] of etypeTags) {
      if (!EVENT_TYPES.includes(etype as EventType)) return false;
    }
  }
  // If no etype tags, event is still valid (backward compatibility)

  // Validate visibility
  const visibilityTag = event.tags.find(([name]) => name === 'visibility')?.[1];
  if (visibilityTag && !['public', 'tribe-only', 'private'].includes(visibilityTag)) return false;

  // Validate content length
  if (event.content.length > 500) return false;

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

// Apply event filters
export function applyEventFilters(
  events: NostrEvent[],
  filters: EventFilters,
  userPubkey?: string
): NostrEvent[] {
  let filteredEvents = events;

  // Filter by event types
  if (filters.etypes && filters.etypes.length > 0) {
    filteredEvents = filteredEvents.filter(event => {
      const eventTypes = event.tags.filter(([name]) => name === 'etype').map(([, value]) => value);
      return filters.etypes!.some(filterType => eventTypes.includes(filterType));
    });
  }

  // Filter by visibility
  if (filters.visibility && filters.visibility.length > 0) {
    filteredEvents = filteredEvents.filter(event => {
      const visibility = event.tags.find(([name]) => name === 'visibility')?.[1] || 'public';

      // Handle private events - only show if user is organizer or invitee
      if (visibility === 'private') {
        if (!userPubkey) return false;

        const isOrganizer = event.pubkey === userPubkey;
        const isInvited = event.tags.some(([name, value]) => name === 'p' && value === userPubkey);

        return (isOrganizer || isInvited) && filters.showPrivateInvited;
      }

      return filters.visibility!.includes(visibility as EventVisibility);
    });
  }

  // Filter by date range
  if (filters.dateFrom || filters.dateTo) {
    filteredEvents = filteredEvents.filter(event => {
      const startTime = parseInt(event.tags.find(([name]) => name === 'start')?.[1] || '0');

      if (filters.dateFrom) {
        const fromTime = new Date(filters.dateFrom).getTime() / 1000;
        if (startTime < fromTime) return false;
      }

      if (filters.dateTo) {
        const toTime = new Date(filters.dateTo).getTime() / 1000;
        if (startTime > toTime) return false;
      }

      return true;
    });
  }

  // Filter by search term
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    filteredEvents = filteredEvents.filter(event => {
      const title = event.tags.find(([name]) => name === 'title')?.[1] || '';
      const summary = event.tags.find(([name]) => name === 'summary')?.[1] || '';
      const place = event.tags.find(([name]) => name === 'place')?.[1] || '';
      const eventTypes = event.tags.filter(([name]) => name === 'etype').map(([, value]) => value).join(' ');

      return title.toLowerCase().includes(searchLower) ||
             summary.toLowerCase().includes(searchLower) ||
             place.toLowerCase().includes(searchLower) ||
             eventTypes.toLowerCase().includes(searchLower) ||
             event.content.toLowerCase().includes(searchLower);
    });
  }

  return filteredEvents;
}

// Helper function to extract enhanced event data
export function extractEnhancedEventData(event: NostrEvent) {
  const tags = event.tags;
  const getTag = (name: string) => tags.find(([n]) => n === name)?.[1];
  const getAllTags = (name: string) => tags.filter(([n]) => n === name).map(([, value]) => value);

  return {
    id: event.id,
    pubkey: event.pubkey,
    kind: event.kind,
    content: event.content,
    createdAt: event.created_at,
    dTag: getTag('d'),
    tribe: getTag('tribe'),
    title: getTag('title'),
    start: getTag('start') ? parseInt(getTag('start')!) : undefined,
    end: getTag('end') ? parseInt(getTag('end')!) : undefined,
    place: getTag('place'),
    location: getTag('l'),
    visibility: getTag('visibility') as EventVisibility || 'public',
    villages: getAllTags('village'),
    etypes: getAllTags('etype') as EventType[],
    invitees: getAllTags('p'),
    summary: getTag('summary'),

    // Type-specific data
    foodSlots: getAllTags('food'),
    dietNotes: getTag('diet_notes'),
    tasks: getAllTags('task'),
    toolsNeeded: getTag('tools_needed'),
    instructors: getAllTags('instructors'),
    materials: getTag('materials'),
    gameKind: getTag('game_kind'),
    teamsMode: getTag('teams_mode'),
    occasion: getTag('occasion'),
  };
}

// Helper function to check if user can see private event
export function canUserSeePrivateEvent(event: NostrEvent, userPubkey?: string): boolean {
  const visibility = event.tags.find(([name]) => name === 'visibility')?.[1] || 'public';

  if (visibility !== 'private') return true;
  if (!userPubkey) return false;

  const isOrganizer = event.pubkey === userPubkey;
  const isInvited = event.tags.some(([name, value]) => name === 'p' && value === userPubkey);

  return isOrganizer || isInvited;
}

// Helper function to get event type display info
export function getEventTypeInfo(etype: EventType) {
  const typeInfo = {
    meetup: { emoji: '👥', label: 'Meetup' },
    gathering: { emoji: '👥', label: 'Gathering' },
    potluck: { emoji: '🍲', label: 'Potluck' },
    trivia: { emoji: '🧠', label: 'Trivia' },
    game: { emoji: '🎮', label: 'Game' },
    'service-day': { emoji: '🧹', label: 'Service Day' },
    cleanup: { emoji: '🧹', label: 'Cleanup' },
    workshop: { emoji: '🛠️', label: 'Workshop' },
    'skill-swap': { emoji: '🤝', label: 'Skill Swap' },
    celebration: { emoji: '🎉', label: 'Celebration' },
    ritual: { emoji: '🕯️', label: 'Ritual' },
    market: { emoji: '🛒', label: 'Market' },
    swap: { emoji: '🔄', label: 'Swap' },
    'freebie-fair': { emoji: '🎁', label: 'Freebie Fair' },
    mixer: { emoji: '💫', label: 'Mixer' },
    matchmaking: { emoji: '💕', label: 'Matchmaking' },
    council: { emoji: '🏛️', label: 'Council' },
    'tribe-meeting': { emoji: '🏛️', label: 'Tribe Meeting' },
  };

  return typeInfo[etype] || { emoji: '📅', label: etype };
}