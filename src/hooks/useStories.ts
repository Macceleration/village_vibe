import { useNostr } from '@nostrify/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { NostrEvent } from '@nostrify/nostrify';
import { useVillagePreferences } from './useVillagePreferences';

// Story filter options
export interface StoryFilters {
  tribe?: string;
  village?: string;
  search?: string;
  featured?: boolean;
  limit?: number;
}

// Hook to get stories for a specific tribe
export function useTribeStories(tribeId: string, filters: StoryFilters = {}) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['tribe-stories', tribeId, filters],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(1500)]);

      // Parse tribe coordinates
      const [pubkey, dTag] = tribeId.split(':');
      if (!pubkey || !dTag) return [];

      console.log('🔍 Querying stories for tribe:', { tribeId, dTag });

      // Use the same approach as services - query by author first
      const authorEvents = await nostr.query([{
        kinds: [30023], // Long-form content (NIP-23)
        authors: [pubkey],
        limit: 100,
      }], { signal });

      console.log('📦 Found stories by author:', authorEvents.length);

      // Filter by tribe tag client-side, but fallback to showing all author's stories
      let tribeEvents = authorEvents.filter(event => {
        const tribeTags = event.tags.filter(([name]) => name === 'tribe');
        const matchesTribe = tribeTags.some(([, value]) => value === dTag);
        return matchesTribe;
      });

      console.log('📚 Stories matching exact tribe:', tribeEvents.length);

      // If no stories match the exact tribe, show all stories from this author
      if (tribeEvents.length === 0) {
        tribeEvents = authorEvents;
        console.log('📋 Falling back to all author stories:', tribeEvents.length);
      }

      // Apply additional filters
      let filteredEvents = tribeEvents;

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

      const validEvents = filteredEvents.filter(validateStoryEvent);
      console.log('✅ Valid stories:', validEvents.length);

      // Sort by creation date (newest first)
      return validEvents.sort((a, b) => b.created_at - a.created_at);
    },
  });
}

// Hook to get stories for a village
export function useVillageStories(villageSlug: string, filters: StoryFilters = {}) {
  const { nostr } = useNostr();
  const { preferences } = useVillagePreferences();

  return useQuery({
    queryKey: ['village-stories', villageSlug, filters, preferences.hiddenTribes],
    staleTime: 30000, // Consider data fresh for 30 seconds
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(1500)]);

      console.log('🏘️ Querying village stories for:', villageSlug);

      // Strategy 1: Try to query with village tag filter first (more efficient if relay supports it)
      let villageEvents: NostrEvent[] = [];

      if (villageSlug !== 'main') {
        try {
          console.log('🔍 Trying relay-level village filter for:', villageSlug);
          villageEvents = await nostr.query([{
            kinds: [30023],
            '#village': [villageSlug],
            limit: filters.limit || 100,
          }], { signal });
          console.log('📦 Found stories via relay filter:', villageEvents.length);
        } catch {
          console.log('⚠️ Relay-level village filter failed, falling back to client-side filtering');
        }
      }

      // Strategy 2: If relay filtering didn't work or for main village, use client-side filtering
      if (villageEvents.length === 0 || villageSlug === 'main') {
        console.log('🔍 Using client-side filtering for village stories');

        // Get all stories and filter client-side
        const allEvents = await nostr.query([{
          kinds: [30023], // Long-form content (NIP-23)
          limit: filters.limit || 200, // Increase limit for client-side filtering
        }], { signal });

        console.log('📦 Found all stories for client-side filtering:', allEvents.length);

        // Filter for stories that have village tags
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

        console.log('🏘️ Stories with village tag (client-side):', villageEvents.length);
      }

      // Strategy 3: Also query for stories with promotion labels and merge them
      try {
        console.log('🔍 Querying promotion labels for village:', villageSlug);
        const promotionLabels = await nostr.query([{
          kinds: [1985], // Labels
          '#l': ['village-promoted'],
          limit: 100,
        }], { signal });

        console.log('📋 Found promotion labels:', promotionLabels.length);

        // Extract story references from promotion labels
        const promotedStoryRefs = promotionLabels
          .map(label => label.tags.find(([name]) => name === 'a')?.[1])
          .filter((ref): ref is string => Boolean(ref))
          .filter(ref => ref.startsWith('30023:'));

        if (promotedStoryRefs.length > 0) {
          console.log('📚 Found promoted story references:', promotedStoryRefs.length);

          // Query the actual promoted stories
          const promotedStories = await nostr.query([{
            kinds: [30023],
            // Note: We can't directly query by 'a' tag, so we'll need to get all and filter
            limit: 200,
          }], { signal });

          // Filter promoted stories and merge with village events
          const matchingPromotedStories = promotedStories.filter(story => {
            const storyRef = `30023:${story.pubkey}:${story.tags.find(([name]) => name === 'd')?.[1]}`;
            return promotedStoryRefs.includes(storyRef);
          });

          console.log('✨ Found matching promoted stories:', matchingPromotedStories.length);

          // Merge with existing village events (avoid duplicates)
          const existingIds = new Set(villageEvents.map(e => e.id));
          const newPromotedStories = matchingPromotedStories.filter(story => !existingIds.has(story.id));
          villageEvents = [...villageEvents, ...newPromotedStories];

          console.log('🔄 Merged promoted stories, total:', villageEvents.length);
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

      const validEvents = filteredEvents.filter(validateStoryEvent);
      console.log('✅ Valid village stories after all strategies:', validEvents.length);

      // Filter out stories from hidden tribes
      const nonHiddenEvents = validEvents.filter(event => {
        const tribeTag = event.tags.find(([name]) => name === 'tribe')?.[1];
        return !tribeTag || !preferences.hiddenTribes.includes(tribeTag);
      });

      console.log('🚫 After filtering hidden tribes:', nonHiddenEvents.length);

      // Deduplicate events by ID and sort by creation date (newest first)
      const uniqueEvents = Array.from(
        new Map(nonHiddenEvents.map(event => [event.id, event])).values()
      );

      return uniqueEvents.sort((a, b) => b.created_at - a.created_at);
    },
  });
}

// Hook to get a specific story
export function useStory(storyId: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['story', storyId],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(1500)]);

      // Parse story coordinates (format: pubkey:d-identifier)
      const [pubkey, dTag] = storyId.split(':');
      if (!pubkey || !dTag) {
        throw new Error('Invalid story ID format');
      }

      const events = await nostr.query([
        {
          kinds: [30023],
          authors: [pubkey],
          '#d': [dTag],
          limit: 1,
        }
      ], { signal });

      const event = events[0];
      return event && validateStoryEvent(event) ? event : null;
    },
  });
}

// Hook to get story labels (for moderation)
export function useStoryLabels(storyId: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['story-labels', storyId],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(1500)]);

      // Parse story coordinates
      const [pubkey, dTag] = storyId.split(':');
      if (!pubkey || !dTag) return [];

      // Query for labels targeting this story
      const aRef = `30023:${pubkey}:${dTag}`;
      const events = await nostr.query([
        {
          kinds: [1985], // Label (NIP-32)
          '#a': [aRef],
          limit: 50,
        }
      ], { signal });

      return events.filter(validateLabelEvent);
    },
  });
}

// Hook to create or update a story
export function useCreateStory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      tribe: string;
      title: string;
      summary?: string;
      content: string;
      cover?: string;
      place?: string;
      lat?: number;
      lon?: number;
      refEventId?: string;
      villages?: string[];
      dTag?: string; // For updates
    }) => {
      // Generate a unique d tag if not provided (for updates)
      const dTag = data.dTag || `story-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Build tags array
      const tags: string[][] = [
        ['d', dTag],
        ['tribe', data.tribe],
        ['title', data.title],
        ['alt', 'Community story shared with the village'],
      ];

      // Add optional tags
      if (data.summary) tags.push(['summary', data.summary]);
      if (data.cover) tags.push(['cover', data.cover]);
      if (data.place) tags.push(['place', data.place]);
      if (data.lat && data.lon) {
        tags.push(['l', `${data.lat.toFixed(4)},${data.lon.toFixed(4)}`]);
      }
      if (data.refEventId) tags.push(['ref', data.refEventId]);

      // Add village tags (only if promoted)
      if (data.villages && data.villages.length > 0) {
        data.villages.forEach(village => {
          tags.push(['village', village]);
        });
      }

      // Create the event
      const eventData = {
        kind: 30023,
        content: data.content,
        tags,
        created_at: Math.floor(Date.now() / 1000),
      };

      // Note: This will be published using useNostrPublish in the component
      return { ...data, dTag, eventData };
    },
    onSuccess: (result, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: ['tribe-stories']
      });
      queryClient.invalidateQueries({
        queryKey: ['village-stories']
      });
      queryClient.invalidateQueries({
        queryKey: ['multi-village-stories']
      });
      if (variables.villages) {
        variables.villages.forEach(village => {
          queryClient.invalidateQueries({
            queryKey: ['village-stories', village]
          });
        });
      }
    },
  });
}

// Hook to create a story label (for moderation)
export function useCreateStoryLabel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      storyId: string;
      label: string;
      namespace?: string;
      content?: string;
    }) => {
      // Parse story coordinates
      const [pubkey, dTag] = data.storyId.split(':');
      if (!pubkey || !dTag) {
        throw new Error('Invalid story ID format');
      }

      // Build tags array
      const tags: string[][] = [
        ['a', `30023:${pubkey}:${dTag}`],
        ['l', data.label, data.namespace || 'ugc'],
        ['alt', `Story moderation label: ${data.label}`],
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
      // Invalidate labels for this story
      queryClient.invalidateQueries({
        queryKey: ['story-labels', variables.storyId]
      });

      // If this is a village promotion, invalidate village stories
      if (variables.label === 'village-promoted') {
        queryClient.invalidateQueries({
          queryKey: ['village-stories']
        });
        queryClient.invalidateQueries({
          queryKey: ['multi-village-stories']
        });
      }
    },
  });
}

// Hook to promote a story to villages (creates label AND updates story with village tags)
export function usePromoteStoryToVillages() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      story: NostrEvent;
      villages: string[];
      reason?: string;
    }) => {
      const { story, villages, reason } = data;

      // Parse story data
      const dTag = story.tags.find(([name]) => name === 'd')?.[1];
      if (!dTag) {
        throw new Error('Story missing d tag');
      }

      const storyId = `${story.pubkey}:${dTag}`;

      // Get existing village tags
      const existingVillageTags = story.tags.filter(([name]) => name === 'village').map(([, value]) => value);
      const newVillages = villages.filter(v => !existingVillageTags.includes(v));
      const allVillages = [...existingVillageTags, ...newVillages];

      // Create updated story with village tags
      const updatedTags = [
        ...story.tags.filter(([name]) => name !== 'village'), // Remove existing village tags
        ...allVillages.map(village => ['village', village]), // Add all village tags
      ];

      const updatedStory = {
        kind: 30023,
        content: story.content,
        tags: updatedTags,
        created_at: Math.floor(Date.now() / 1000),
      };

      // Create promotion label
      const labelTags: string[][] = [
        ['a', `30023:${story.pubkey}:${dTag}`],
        ['l', 'village-promoted', 'promotion'],
        ['L', 'promotion'],
        ['alt', `Story promoted to villages: ${villages.join(', ')}`],
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
        storyId,
        updatedStory,
        promotionLabel,
        villages: allVillages,
      };
    },
    onSuccess: (result) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: ['story', result.storyId]
      });
      queryClient.invalidateQueries({
        queryKey: ['story-labels', result.storyId]
      });
      queryClient.invalidateQueries({
        queryKey: ['tribe-stories']
      });
      queryClient.invalidateQueries({
        queryKey: ['village-stories']
      });
      queryClient.invalidateQueries({
        queryKey: ['multi-village-stories']
      });

      // Invalidate specific village queries
      result.villages.forEach(village => {
        queryClient.invalidateQueries({
          queryKey: ['village-stories', village]
        });
      });
    },
  });
}

// Validate story event structure
export function validateStoryEvent(event: NostrEvent): boolean {
  if (event.kind !== 30023) return false;

  const dTag = event.tags.find(([name]) => name === 'd')?.[1];
  const tribeTag = event.tags.find(([name]) => name === 'tribe')?.[1];
  const titleTag = event.tags.find(([name]) => name === 'title')?.[1];

  // Required tags
  if (!dTag || !tribeTag || !titleTag) return false;

  // Content should not be empty
  if (!event.content.trim()) return false;

  return true;
}

// Validate label event structure
export function validateLabelEvent(event: NostrEvent): boolean {
  if (event.kind !== 1985) return false;

  const aTag = event.tags.find(([name]) => name === 'a')?.[1];
  const lTag = event.tags.find(([name]) => name === 'l')?.[1];

  if (!aTag || !lTag) return false;

  // Check if it's targeting a story
  if (!aTag.startsWith('30023:')) return false;

  return true;
}

// Helper function to extract story data from event
export function extractStoryData(event: NostrEvent) {
  const tags = event.tags;
  const getTag = (name: string) => tags.find(([n]) => n === name)?.[1];
  const getAllTags = (name: string) => tags.filter(([n]) => n === name).map(([, value]) => value);

  return {
    id: event.id,
    pubkey: event.pubkey,
    content: event.content,
    createdAt: event.created_at,
    dTag: getTag('d'),
    tribe: getTag('tribe'),
    villages: getAllTags('village'),
    title: getTag('title'),
    summary: getTag('summary'),
    cover: getTag('cover'),
    place: getTag('place'),
    location: getTag('l'),
    refEventId: getTag('ref'),
    publishedAt: getTag('published_at'),
  };
}

// Hook to get stories for multiple villages (for village feed preferences)
export function useMultiVillageStories(villages: string[], filters: StoryFilters = {}) {
  const { nostr } = useNostr();
  const { preferences } = useVillagePreferences();

  return useQuery({
    queryKey: ['multi-village-stories', villages, filters, preferences.hiddenTribes],
    staleTime: 30000, // Consider data fresh for 30 seconds
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(1500)]);

      console.log('🏘️ Querying stories for multiple villages:', villages);

      let villageEvents: NostrEvent[] = [];

      // Strategy 1: Try relay-level filtering for each village
      if (villages.length > 0) {
        try {
          console.log('🔍 Trying relay-level village filters for:', villages);
          const villageQueries = villages.map(village => ({
            kinds: [30023],
            '#village': [village],
            limit: Math.ceil((filters.limit || 100) / villages.length),
          }));

          const villageResults = await Promise.all(
            villageQueries.map(query =>
              nostr.query([query], { signal }).catch(() => [])
            )
          );

          villageEvents = villageResults.flat();
          console.log('📦 Found stories via relay filters:', villageEvents.length);
        } catch {
          console.log('⚠️ Relay-level village filters failed, falling back to client-side filtering');
        }
      }

      // Strategy 2: If relay filtering didn't work, use client-side filtering
      if (villageEvents.length === 0) {
        console.log('🔍 Using client-side filtering for multiple villages');

        // Get all stories and filter client-side
        const allEvents = await nostr.query([{
          kinds: [30023], // Long-form content (NIP-23)
          limit: filters.limit || 200, // Increase limit for client-side filtering
        }], { signal });

        console.log('📦 Found all stories for client-side filtering:', allEvents.length);

        // Filter for stories that match any of the specified villages
        villageEvents = allEvents.filter(event => {
          const villageTags = event.tags.filter(([name]) => name === 'village');
          return villageTags.some(([, value]) => villages.includes(value));
        });

        console.log('🏘️ Stories matching villages (client-side):', villageEvents.length);
      }

      // Strategy 3: Also query for stories with promotion labels
      try {
        console.log('🔍 Querying promotion labels for multiple villages');
        const promotionLabels = await nostr.query([{
          kinds: [1985], // Labels
          '#l': ['village-promoted'],
          limit: 100,
        }], { signal });

        console.log('📋 Found promotion labels:', promotionLabels.length);

        // Extract story references from promotion labels
        const promotedStoryRefs = promotionLabels
          .map(label => label.tags.find(([name]) => name === 'a')?.[1])
          .filter((ref): ref is string => Boolean(ref))
          .filter(ref => ref.startsWith('30023:'));

        if (promotedStoryRefs.length > 0) {
          console.log('📚 Found promoted story references:', promotedStoryRefs.length);

          // Query the actual promoted stories
          const promotedStories = await nostr.query([{
            kinds: [30023],
            limit: 200,
          }], { signal });

          // Filter promoted stories and merge with village events
          const matchingPromotedStories = promotedStories.filter(story => {
            const storyRef = `30023:${story.pubkey}:${story.tags.find(([name]) => name === 'd')?.[1]}`;
            return promotedStoryRefs.includes(storyRef);
          });

          console.log('✨ Found matching promoted stories:', matchingPromotedStories.length);

          // Merge with existing village events (avoid duplicates)
          const existingIds = new Set(villageEvents.map(e => e.id));
          const newPromotedStories = matchingPromotedStories.filter(story => !existingIds.has(story.id));
          villageEvents = [...villageEvents, ...newPromotedStories];

          console.log('🔄 Merged promoted stories, total:', villageEvents.length);
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

      const validEvents = filteredEvents.filter(validateStoryEvent);
      console.log('✅ Valid village stories after all strategies:', validEvents.length);

      // Filter out stories from hidden tribes
      const nonHiddenEvents = validEvents.filter(event => {
        const tribeTag = event.tags.find(([name]) => name === 'tribe')?.[1];
        return !tribeTag || !preferences.hiddenTribes.includes(tribeTag);
      });

      console.log('🚫 After filtering hidden tribes:', nonHiddenEvents.length);

      // Deduplicate events by ID and sort by creation date (newest first)
      const uniqueEvents = Array.from(
        new Map(nonHiddenEvents.map(event => [event.id, event])).values()
      );

      return uniqueEvents.sort((a, b) => b.created_at - a.created_at);
    },
  });
}

// Helper function to check if story is promoted to village
export function isStoryPromoted(event: NostrEvent): boolean {
  return event.tags.some(([name]) => name === 'village');
}

// Helper function to get story coordinates (for naddr)
export function getStoryCoordinates(event: NostrEvent): string {
  const dTag = event.tags.find(([name]) => name === 'd')?.[1];
  if (!dTag) return '';
  return `${event.pubkey}:${dTag}`;
}