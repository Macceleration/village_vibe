import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { useAppContext } from './useAppContext';

export function useRelayHealth() {
  const { nostr } = useNostr();
  const { config } = useAppContext();

  return useQuery({
    queryKey: ['relay-health', config.relayUrl],
    queryFn: async () => {
      const startTime = Date.now();
      
      try {
        // Simple query to test relay responsiveness
        const events = await nostr.query([{
          kinds: [0],
          limit: 1,
        }], { signal: AbortSignal.timeout(3000) });

        const latency = Date.now() - startTime;

        return {
          status: 'connected',
          latency,
          relayUrl: config.relayUrl,
          timestamp: new Date().toISOString(),
          responsive: latency < 2000,
        };
      } catch (err) {
        return {
          status: 'error',
          latency: Date.now() - startTime,
          relayUrl: config.relayUrl,
          timestamp: new Date().toISOString(),
          error: String(err),
          responsive: false,
        };
      }
    },
    staleTime: 30000, // Check every 30 seconds
    refetchInterval: 30000,
  });
}
