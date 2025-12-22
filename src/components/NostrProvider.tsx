import React, { useEffect, useRef } from 'react';
import { NostrEvent, NPool, NRelay1 } from '@nostrify/nostrify';
import { NostrContext } from '@nostrify/react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppContext } from '@/hooks/useAppContext';

interface NostrProviderProps {
  children: React.ReactNode;
}

const NostrProvider: React.FC<NostrProviderProps> = (props) => {
  const { children } = props;
  const { config, presetRelays } = useAppContext();

  const queryClient = useQueryClient();

  // Create NPool instance only once
  const pool = useRef<NPool | undefined>(undefined);

  // Use refs so the pool always has the latest data
  const relayUrl = useRef<string>(config.relayUrl);

  // Update refs when config changes
  useEffect(() => {
    relayUrl.current = config.relayUrl;
    // Don't reset queries on relay change - let existing data persist
    // queryClient.resetQueries();
  }, [config.relayUrl, queryClient]);

  // Initialize NPool only once
  if (!pool.current) {
    pool.current = new NPool({
      open(url: string) {
        return new NRelay1(url);
      },
      reqRouter(filters) {
        // Query from multiple relays for better reliability and content discovery
        const relaysToQuery = new Map();

        // Primary relay (user selected)
        relaysToQuery.set(relayUrl.current, filters);

        // Add Ditto as a fallback (consistently good performance)
        if (relayUrl.current !== 'wss://ditto.pub/relay') {
          relaysToQuery.set('wss://ditto.pub/relay', filters);
        }

        // Add Damus as a reliable fallback
        if (relayUrl.current !== 'wss://relay.damus.io') {
          relaysToQuery.set('wss://relay.damus.io', filters);
        }

        // Add one more preset relay for redundancy (up to 4 total)
        if (presetRelays && presetRelays.length > 0) {
          const additionalRelay = presetRelays.find(r =>
            r.url !== relayUrl.current &&
            r.url !== 'wss://ditto.pub/relay' &&
            r.url !== 'wss://relay.damus.io'
          );

          if (additionalRelay) {
            relaysToQuery.set(additionalRelay.url, filters);
          }
        }

        return relaysToQuery;
      },
      eventRouter(_event: NostrEvent) {
        // Publish to the selected relay and fallback relays
        const allRelays = new Set<string>([relayUrl.current]);

        // Always include Ditto for publishing
        allRelays.add('wss://ditto.pub/relay');

        // Also publish to the preset relays, capped to 5 total
        for (const { url } of (presetRelays ?? [])) {
          allRelays.add(url);

          if (allRelays.size >= 5) {
            break;
          }
        }

        return [...allRelays];
      },
    });
  }

  return (
    <NostrContext.Provider value={{ nostr: pool.current }}>
      {children}
    </NostrContext.Provider>
  );
};

export default NostrProvider;