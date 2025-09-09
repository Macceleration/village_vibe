import { useNostr } from '@nostrify/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { NostrEvent } from '@nostrify/nostrify';

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
}

// Hook to get services for a specific tribe
export function useTribeServices(tribeId: string, filters: ServiceFilters = {}) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['tribe-services', tribeId, filters],
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

      // Filter by tribe tag client-side (same as debug component)
      const tribeEvents = authorEvents.filter(event => {
        const tribeTags = event.tags.filter(([name]) => name === 'tribe');
        const matchesTribe = tribeTags.some(([, value]) => value === dTag);
        return matchesTribe;
      });

      console.log('🏘️ Events matching tribe:', tribeEvents.length);

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

  return useQuery({
    queryKey: ['village-services', villageSlug, filters],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(1500)]);

      // Build filter for both offers and requests
      const kinds: number[] = [];
      if (!filters.type || filters.type === 'offer') kinds.push(38857);
      if (!filters.type || filters.type === 'request') kinds.push(30627);

      const baseFilter: {
        kinds: number[];
        '#village': string[];
        limit: number;
        '#t'?: string[];
      } = {
        kinds,
        '#village': [villageSlug],
        limit: 100,
      };

      // Add category filter if specified
      if (filters.category) {
        baseFilter['#t'] = [filters.category];
      }

      // Query for village services
      const events = await nostr.query([baseFilter], { signal });

      return events.filter(validateServiceEvent);
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