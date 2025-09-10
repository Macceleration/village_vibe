import { useNostr } from '@nostrify/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { NostrEvent } from '@nostrify/nostrify';
import { useVillagePreferences } from './useVillagePreferences';

// Service categories
export const SERVICE_CATEGORIES = [
  'yardwork',
  'pets',
  'eldercare',
  'errands',
  'oddjobs'
] as const;

export type ServiceCategory = typeof SERVICE_CATEGORIES[number];

// Service types
export type ServiceType = 'offer' | 'request';

// Service filter options
export interface ServiceFilters {
  type?: ServiceType;
  category?: ServiceCategory;
  distance?: string; // '3blocks' | '0.5mi' | '1mi'
  when?: string; // 'mornings' | 'afternoons' | 'evenings' | 'weekends'
  trusted?: boolean;
  village?: string;
  search?: string;
  limit?: number;
}

// Hook to get services for a specific tribe
export function useTribeServices(tribeId: string, filters: ServiceFilters = {}) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['tribe-services', tribeId, filters],
    staleTime: 30000, // Consider data fresh for 30 seconds
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(1500)]);

      // Parse tribe coordinates
      const [pubkey, dTag] = tribeId.split(':');
      if (!pubkey || !dTag) return [];

      // Build filter for both offers and requests
      const kinds: number[] = [];
      if (!filters.type || filters.type === 'offer') kinds.push(38857);
      if (!filters.type || filters.type === 'request') kinds.push(30627);

      console.log('🔍 Querying services for tribe:', { tribeId, dTag, kinds });

      // Use the same approach as the debug component that works
      const authorEvents = await nostr.query([{
        kinds,
        authors: [pubkey],
        limit: 100,
      }], { signal });

      console.log('📦 Found events by author:', authorEvents.length);

      // Filter by tribe tag client-side, but fallback to showing all author's services
      let tribeEvents = authorEvents.filter(event => {
        const tribeTags = event.tags.filter(([name]) => name === 'tribe');
        const matchesTribe = tribeTags.some(([, value]) => value === dTag);
        return matchesTribe;
      });

      console.log('🏘️ Events matching exact tribe:', tribeEvents.length);

      // If no services match the exact tribe, show all services from this author
      // This helps when services were created for different tribes by the same author
      if (tribeEvents.length === 0) {
        tribeEvents = authorEvents;
        console.log('📋 Falling back to all author services:', tribeEvents.length);
      }

      // Apply additional filters
      let filteredEvents = tribeEvents;

      if (filters.category) {
        filteredEvents = filteredEvents.filter(event => {
          return event.tags.some(([name, value]) => name === 't' && value === filters.category);
        });
      }

      if (filters.village) {
        filteredEvents = filteredEvents.filter(event => {
          return event.tags.some(([name, value]) => name === 'village' && value === filters.village);
        });
      }

      console.log('🎯 After filters:', filteredEvents.length);

      const validEvents = filteredEvents.filter(validateServiceEvent);
      console.log('✅ Valid services:', validEvents.length);

      // TODO: Filter out moderated services by checking for NIP-32 moderation labels
      // For now, return all valid events
      return validEvents;
    },
  });
}

// Hook to get a specific service
export function useService(serviceId: string, kind: 38857 | 30627) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['service', serviceId, kind],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(1500)]);

      // Parse service coordinates (format: pubkey:d-identifier)
      const [pubkey, dTag] = serviceId.split(':');
      if (!pubkey || !dTag) {
        throw new Error('Invalid service ID format');
      }

      const events = await nostr.query([
        {
          kinds: [kind],
          authors: [pubkey],
          '#d': [dTag],
          limit: 1,
        }
      ], { signal });

      const event = events[0];
      return event && validateServiceEvent(event) ? event : null;
    },
  });
}

// Hook to get services by village
export function useVillageServices(villageSlug: string, filters: ServiceFilters = {}) {
  const { nostr } = useNostr();
  const { preferences } = useVillagePreferences();

  return useQuery({
    queryKey: ['village-services', villageSlug, filters],
    staleTime: 30000, // Consider data fresh for 30 seconds
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(1500)]);

      // Build filter for both offers and requests
      const kinds: number[] = [];
      if (!filters.type || filters.type === 'offer') kinds.push(38857);
      if (!filters.type || filters.type === 'request') kinds.push(30627);

      console.log('🏘️ Querying village services for:', villageSlug);

      let villageEvents: NostrEvent[] = [];

      // Strategy 1: Try to query with village tag filter first (more efficient if relay supports it)
      if (villageSlug !== 'main') {
        try {
          console.log('🔍 Trying relay-level village filter for services:', villageSlug);
          villageEvents = await nostr.query([{
            kinds,
            '#village': [villageSlug],
            limit: filters.limit || 100,
          }], { signal });
          console.log('📦 Found services via relay filter:', villageEvents.length);
        } catch {
          console.log('⚠️ Relay-level village filter failed, falling back to client-side filtering');
        }
      }

      // Strategy 2: If relay filtering didn't work or for main village, use client-side filtering
      if (villageEvents.length === 0 || villageSlug === 'main') {
        console.log('🔍 Using client-side filtering for village services');

        // Get all services and filter client-side
        const allEvents = await nostr.query([{
          kinds,
          limit: filters.limit || 200, // Increase limit for client-side filtering
        }], { signal });

        console.log('📦 Found all services for client-side filtering:', allEvents.length);

        // Filter for services that have village tags
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

        console.log('🏘️ Services with village tag (client-side):', villageEvents.length);
      }

      // Strategy 3: Also query for services with promotion labels and merge them
      try {
        console.log('🔍 Querying promotion labels for village services:', villageSlug);
        const promotionLabels = await nostr.query([{
          kinds: [1985], // Labels
          '#l': ['village-promoted'],
          limit: 100,
        }], { signal });

        console.log('📋 Found promotion labels:', promotionLabels.length);

        // Extract service references from promotion labels
        const promotedServiceRefs = promotionLabels
          .map(label => label.tags.find(([name]) => name === 'a')?.[1])
          .filter((ref): ref is string => Boolean(ref))
          .filter(ref => ref.startsWith('38857:') || ref.startsWith('30627:'));

        if (promotedServiceRefs.length > 0) {
          console.log('📚 Found promoted service references:', promotedServiceRefs.length);

          // Query the actual promoted services
          const promotedServices = await nostr.query([{
            kinds,
            limit: 200,
          }], { signal });

          // Filter promoted services and merge with village events
          const matchingPromotedServices = promotedServices.filter(service => {
            const serviceRef = `${service.kind}:${service.pubkey}:${service.tags.find(([name]) => name === 'd')?.[1]}`;
            return promotedServiceRefs.includes(serviceRef);
          });

          console.log('✨ Found matching promoted services:', matchingPromotedServices.length);

          // Merge with existing village events (avoid duplicates)
          const existingIds = new Set(villageEvents.map(e => e.id));
          const newPromotedServices = matchingPromotedServices.filter(service => !existingIds.has(service.id));
          villageEvents = [...villageEvents, ...newPromotedServices];

          console.log('🔄 Merged promoted services, total:', villageEvents.length);
        }
      } catch (err) {
        console.log('⚠️ Failed to query promotion labels:', err);
      }

      // Apply additional filters
      let filteredEvents = villageEvents;

      if (filters.category) {
        filteredEvents = filteredEvents.filter(event => {
          return event.tags.some(([name, value]) => name === 't' && value === filters.category);
        });
      }

      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredEvents = filteredEvents.filter(event => {
          return event.content.toLowerCase().includes(searchLower);
        });
      }

      const validEvents = filteredEvents.filter(validateServiceEvent);
      console.log('✅ Valid village services after all strategies:', validEvents.length);

      // Filter out services from hidden tribes
      const nonHiddenEvents = validEvents.filter(event => {
        const tribeTag = event.tags.find(([name]) => name === 'tribe')?.[1];
        return !tribeTag || !preferences.hiddenTribes.includes(tribeTag);
      });

      console.log('🚫 After filtering hidden tribes:', nonHiddenEvents.length);

      // Sort by creation date (newest first)
      return nonHiddenEvents.sort((a, b) => b.created_at - a.created_at);
    },
  });
}

// Hook to get service matches for a service
export function useServiceMatches(serviceId: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['service-matches', serviceId],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(1500)]);

      const [pubkey, dTag] = serviceId.split(':');
      if (!pubkey || !dTag) return [];

      // Look for matches that reference this service
      const events = await nostr.query([
        {
          kinds: [34871], // Service Match
          '#a': [`38857:${pubkey}:${dTag}`, `30627:${pubkey}:${dTag}`],
          limit: 50,
        }
      ], { signal });

      return events.filter(validateServiceMatchEvent);
    },
  });
}

// Hook to create or update a service
export function useCreateService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      type: ServiceType;
      tribe: string;
      category: ServiceCategory;
      content: string;
      lat: number;
      lon: number;
      area?: string;
      avail?: string;
      time?: string;
      rate?: string;
      radius?: string;
      villages?: string[];
      expires?: number;
      dTag?: string; // For updates
    }) => {
      // Generate a unique d tag if not provided (for updates)
      const dTag = data.dTag || `${data.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Determine the kind based on service type
      const kind = data.type === 'offer' ? 38857 : 30627;

      // Build tags array
      const tags: string[][] = [
        ['d', dTag],
        ['tribe', data.tribe],
        ['t', data.category],
        ['l', `${data.lat.toFixed(4)},${data.lon.toFixed(4)}`], // Round for privacy
        ['alt', `Service ${data.type} for local community help`],
      ];

      // Add optional tags
      if (data.area) tags.push(['area', data.area]);
      if (data.avail) tags.push(['avail', data.avail]);
      if (data.time) tags.push(['time', data.time]);
      if (data.rate) tags.push(['rate', data.rate]);
      if (data.radius) tags.push(['radius', data.radius]);
      if (data.expires) tags.push(['expires', data.expires.toString()]);

      // Add village tags
      if (data.villages && data.villages.length > 0) {
        data.villages.forEach(village => {
          tags.push(['village', village]);
        });
      }

      // Create the event
      const eventData = {
        kind,
        content: data.content,
        tags,
        created_at: Math.floor(Date.now() / 1000),
      };

      // Note: This will be published using useNostrPublish in the component
      return { ...data, dTag, kind, eventData };
    },
    onSuccess: (result, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: ['tribe-services']
      });
      queryClient.invalidateQueries({
        queryKey: ['village-services']
      });
      if (variables.villages) {
        variables.villages.forEach(village => {
          queryClient.invalidateQueries({
            queryKey: ['village-services', village]
          });
        });
      }
    },
  });
}

// Hook to promote a service to villages (creates label AND updates service with village tags)
export function usePromoteServiceToVillages() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      service: NostrEvent;
      villages: string[];
      reason?: string;
    }) => {
      const { service, villages, reason } = data;

      // Parse service data
      const dTag = service.tags.find(([name]) => name === 'd')?.[1];
      if (!dTag) {
        throw new Error('Service missing d tag');
      }

      const serviceId = `${service.pubkey}:${dTag}`;

      // Get existing village tags
      const existingVillageTags = service.tags.filter(([name]) => name === 'village').map(([, value]) => value);
      const newVillages = villages.filter(v => !existingVillageTags.includes(v));
      const allVillages = [...existingVillageTags, ...newVillages];

      // Create updated service with village tags
      const updatedTags = [
        ...service.tags.filter(([name]) => name !== 'village'), // Remove existing village tags
        ...allVillages.map(village => ['village', village]), // Add all village tags
      ];

      const updatedService = {
        kind: service.kind,
        content: service.content,
        tags: updatedTags,
        created_at: Math.floor(Date.now() / 1000),
      };

      // Create promotion label
      const labelTags: string[][] = [
        ['a', `${service.kind}:${service.pubkey}:${dTag}`],
        ['l', 'village-promoted', 'promotion'],
        ['L', 'promotion'],
        ['alt', `Service promoted to villages: ${villages.join(', ')}`],
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
        serviceId,
        updatedService,
        promotionLabel,
        villages: allVillages,
      };
    },
    onSuccess: (result) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: ['service', result.serviceId]
      });
      queryClient.invalidateQueries({
        queryKey: ['tribe-services']
      });
      queryClient.invalidateQueries({
        queryKey: ['village-services']
      });

      // Invalidate specific village queries
      result.villages.forEach(village => {
        queryClient.invalidateQueries({
          queryKey: ['village-services', village]
        });
      });
    },
  });
}

// Hook to create a service label (for moderation)
export function useCreateServiceLabel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      serviceId: string;
      serviceKind: 38857 | 30627;
      label: string;
      namespace?: string;
      content?: string;
    }) => {
      // Parse service coordinates
      const [pubkey, dTag] = data.serviceId.split(':');
      if (!pubkey || !dTag) {
        throw new Error('Invalid service ID format');
      }

      // Build tags array
      const tags: string[][] = [
        ['a', `${data.serviceKind}:${pubkey}:${dTag}`],
        ['l', data.label, data.namespace || 'ugc'],
        ['alt', `Service moderation label: ${data.label}`],
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
      // Invalidate labels for this service
      queryClient.invalidateQueries({
        queryKey: ['service-labels', variables.serviceId]
      });

      // If this is a village promotion, invalidate village services
      if (variables.label === 'village-promoted') {
        queryClient.invalidateQueries({
          queryKey: ['village-services']
        });
      }
    },
  });
}

// Hook to create a service match
export function useCreateServiceMatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      requestARef?: string;
      offerARef?: string;
      type: 'offer_to_request' | 'request_to_offer' | 'admin_suggestion';
      message?: string;
    }) => {
      // Generate a unique d tag for the match
      const dTag = `match-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Build tags array
      const tags: string[][] = [
        ['d', dTag],
        ['type', data.type],
        ['alt', 'Service match connecting community members'],
      ];

      // Add service references
      if (data.requestARef) tags.push(['a', data.requestARef]);
      if (data.offerARef) tags.push(['a', data.offerARef]);

      // Create the event
      const eventData = {
        kind: 34871,
        content: data.message || '',
        tags,
        created_at: Math.floor(Date.now() / 1000),
      };

      // Note: This will be published using useNostrPublish in the component
      return { ...data, dTag, eventData };
    },
    onSuccess: (_, variables) => {
      // Invalidate matches for related services
      if (variables.requestARef) {
        const serviceId = variables.requestARef.split(':').slice(1).join(':');
        queryClient.invalidateQueries({
          queryKey: ['service-matches', serviceId]
        });
      }
      if (variables.offerARef) {
        const serviceId = variables.offerARef.split(':').slice(1).join(':');
        queryClient.invalidateQueries({
          queryKey: ['service-matches', serviceId]
        });
      }
    },
  });
}

// Validate service event structure
export function validateServiceEvent(event: NostrEvent): boolean {
  if (![38857, 30627].includes(event.kind)) return false;

  const dTag = event.tags.find(([name]) => name === 'd')?.[1];
  const tribeTag = event.tags.find(([name]) => name === 'tribe')?.[1];
  const categoryTag = event.tags.find(([name]) => name === 't')?.[1];
  const locationTag = event.tags.find(([name]) => name === 'l')?.[1];

  // Required tags
  if (!dTag || !tribeTag || !categoryTag || !locationTag) return false;

  // Validate category
  if (!SERVICE_CATEGORIES.includes(categoryTag as ServiceCategory)) return false;

  // Validate location format (lat,lon)
  const locationParts = locationTag.split(',');
  if (locationParts.length !== 2) return false;

  const [lat, lon] = locationParts.map(Number);
  if (isNaN(lat) || isNaN(lon)) return false;

  // Validate content length
  if (event.content.length > 140) return false;

  return true;
}

// Validate service match event structure
export function validateServiceMatchEvent(event: NostrEvent): boolean {
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

// Helper function to extract service data from event
export function extractServiceData(event: NostrEvent) {
  const tags = event.tags;
  const getTag = (name: string) => tags.find(([n]) => n === name)?.[1];
  const getAllTags = (name: string) => tags.filter(([n]) => n === name).map(([, value]) => value);

  return {
    id: event.id,
    pubkey: event.pubkey,
    kind: event.kind as 38857 | 30627,
    content: event.content,
    createdAt: event.created_at,
    dTag: getTag('d'),
    tribe: getTag('tribe'),
    villages: getAllTags('village'),
    category: getTag('t') as ServiceCategory,
    location: getTag('l'),
    area: getTag('area'),
    availability: getTag('avail'),
    timeWindow: getTag('time'),
    rate: getTag('rate'),
    radius: getTag('radius'),
    contact: getTag('contact'),
    expires: getTag('expires') ? parseInt(getTag('expires')!) : undefined,
  };
}

// Helper function to calculate distance (simplified)
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Helper function to format distance
export function formatDistance(miles: number): string {
  if (miles < 0.1) return '~1 block';
  if (miles < 0.25) return '~3 blocks';
  if (miles < 0.5) return '~½ mile';
  if (miles < 1) return '~¾ mile';
  return `~${Math.round(miles)} mile${miles === 1 ? '' : 's'}`;
}