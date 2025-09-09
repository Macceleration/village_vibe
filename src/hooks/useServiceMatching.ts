import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useCreateServiceMatch } from '@/hooks/useServices';
import type { NostrEvent } from '@nostrify/nostrify';

// Hook for admin to suggest matches between offers and requests
export function useAdminSuggestMatch() {
  const { mutate: createMatch } = useCreateServiceMatch();
  const { mutate: publishEvent } = useNostrPublish();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      offerEvent: NostrEvent;
      requestEvent: NostrEvent;
      suggestion: string;
      notifyParties?: boolean;
    }) => {
      const offerData = extractServiceData(data.offerEvent);
      const requestData = extractServiceData(data.requestEvent);

      const offerRef = `${data.offerEvent.kind}:${data.offerEvent.pubkey}:${offerData.dTag}`;
      const requestRef = `${data.requestEvent.kind}:${data.requestEvent.pubkey}:${requestData.dTag}`;

      // Create the match event data
      const matchData = {
        offerARef: offerRef,
        requestARef: requestRef,
        type: 'admin_suggestion' as const,
        message: data.suggestion,
      };

      // Create the match using the existing hook
      const matchResult = await new Promise((resolve, reject) => {
        createMatch(matchData, {
          onSuccess: (result) => resolve(result),
          onError: (error) => reject(error),
        });
      });

      // If admin wants to notify parties, create notification events
      const notifications: Array<{
        kind: number;
        content: string;
        tags: string[][];
        created_at: number;
      }> = [];

      if (data.notifyParties) {
        // Notification to offer author
        notifications.push({
          kind: 4, // Encrypted DM (NIP-04)
          content: `Admin suggestion: Your service offer might match a request. "${data.suggestion}" - Contact ${requestData.dTag} for details.`,
          tags: [
            ['p', data.offerEvent.pubkey],
            ['alt', 'Admin service match suggestion'],
          ],
          created_at: Math.floor(Date.now() / 1000),
        });

        // Notification to request author
        notifications.push({
          kind: 4, // Encrypted DM (NIP-04)
          content: `Admin suggestion: Found a potential helper for your request. "${data.suggestion}" - Contact ${offerData.dTag} for details.`,
          tags: [
            ['p', data.requestEvent.pubkey],
            ['alt', 'Admin service match suggestion'],
          ],
          created_at: Math.floor(Date.now() / 1000),
        });
      }

      return { matchResult, notifications, offerRef, requestRef };
    },
    onSuccess: (result) => {
      // Publish notifications if any
      result.notifications.forEach(notification => {
        publishEvent(notification);
      });

      // Invalidate match queries
      queryClient.invalidateQueries({ queryKey: ['service-matches'] });
    },
  });
}

// Helper function to extract service data (duplicate from useServices to avoid circular import)
function extractServiceData(event: NostrEvent) {
  const tags = event.tags;
  const getTag = (name: string) => tags.find(([n]) => n === name)?.[1];

  return {
    dTag: getTag('d'),
    tribe: getTag('tribe'),
    category: getTag('t'),
    location: getTag('l'),
    area: getTag('area'),
    availability: getTag('avail'),
    timeWindow: getTag('time'),
    rate: getTag('rate'),
  };
}