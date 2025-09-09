import { useNostr } from '@nostrify/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import type { NostrEvent } from '@nostrify/nostrify';

// Hook to moderate (hide) services
export function useModerateService() {
  const { mutate: publishEvent } = useNostrPublish();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      serviceEvent: NostrEvent;
      reason?: string;
      action: 'hide' | 'remove';
    }) => {
      // Create a NIP-32 label event to mark the service as hidden
      const labelEvent = {
        kind: 1985, // Label (NIP-32)
        content: data.reason || `Service ${data.action}d by moderator`,
        tags: [
          ['L', 'moderation'], // Label namespace
          ['l', data.action === 'hide' ? 'hidden-by-moderator' : 'removed-by-moderator', 'moderation'],
          ['e', data.serviceEvent.id], // Reference to the service event
          ['p', data.serviceEvent.pubkey], // Reference to the service author
          ['k', data.serviceEvent.kind.toString()], // Reference to the service kind
          ['alt', `Moderation action: ${data.action} service`],
        ],
        created_at: Math.floor(Date.now() / 1000),
      };

      return { labelEvent, serviceEvent: data.serviceEvent };
    },
    onSuccess: (result) => {
      // Publish the moderation label
      publishEvent(result.labelEvent);

      // Invalidate queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['tribe-services'] });
      queryClient.invalidateQueries({ queryKey: ['village-services'] });
    },
  });
}

// Hook to get moderation labels for services
export function useServiceModerationLabels(serviceEvents: NostrEvent[]) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['service-moderation-labels', serviceEvents.map(e => e.id).join(',')],
    queryFn: async (c) => {
      if (serviceEvents.length === 0) return [];

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(1500)]);

      // Query for moderation labels that reference these services
      const events = await nostr.query([
        {
          kinds: [1985], // Label (NIP-32)
          '#L': ['moderation'],
          '#e': serviceEvents.map(e => e.id),
          limit: 200,
        }
      ], { signal });

      return events;
    },
    enabled: serviceEvents.length > 0,
  });
}

// Hook to check if a service is moderated
export function useIsServiceModerated(serviceEvent: NostrEvent) {
  const { data: moderationLabels } = useServiceModerationLabels([serviceEvent]);

  const isHidden = moderationLabels?.some(label =>
    label.tags.some(([name, value, namespace]) =>
      name === 'l' &&
      (value === 'hidden-by-moderator' || value === 'removed-by-moderator') &&
      namespace === 'moderation'
    ) &&
    label.tags.some(([name, value]) => name === 'e' && value === serviceEvent.id)
  );

  return { isModerated: isHidden || false, moderationLabels };
}