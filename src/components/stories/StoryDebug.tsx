import { useState } from 'react';
import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Bug } from 'lucide-react';
import type { NostrEvent } from '@nostrify/nostrify';

interface StoryDebugProps {
  tribeId: string;
}

export function StoryDebug({ tribeId }: StoryDebugProps) {
  const { nostr } = useNostr();
  const [isOpen, setIsOpen] = useState(false);

  // Parse tribe coordinates
  const [pubkey, dTag] = tribeId.split(':');

  // Debug queries
  const { data: storiesByTribe, isLoading: storiesByTribeLoading } = useQuery({
    queryKey: ['debug-stories-by-tribe', dTag],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(1500)]);
      return await nostr.query([{
        kinds: [30023],
        '#tribe': [dTag],
        limit: 10,
      }], { signal });
    },
  });

  const { data: storiesByAuthor, isLoading: storiesByAuthorLoading } = useQuery({
    queryKey: ['debug-stories-by-author', pubkey],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(1500)]);
      return await nostr.query([{
        kinds: [30023],
        authors: [pubkey],
        limit: 10,
      }], { signal });
    },
  });

  const { data: recentEvents, isLoading: recentEventsLoading } = useQuery({
    queryKey: ['debug-recent-events', pubkey],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(1500)]);
      return await nostr.query([{
        authors: [pubkey],
        limit: 5,
      }], { signal });
    },
  });

  const { data: allStories, isLoading: allStoriesLoading } = useQuery({
    queryKey: ['debug-all-stories', pubkey],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(1500)]);
      return await nostr.query([{
        kinds: [30023],
        authors: [pubkey],
        limit: 10,
      }], { signal });
    },
  });

  const formatEvent = (event: NostrEvent) => {
    const title = event.tags.find(([name]) => name === 'title')?.[1] || 'Untitled';
    const tribe = event.tags.find(([name]) => name === 'tribe')?.[1];
    const villages = event.tags.filter(([name]) => name === 'village').map(([, value]) => value);

    return {
      id: event.id.slice(0, 8),
      kind: event.kind,
      title,
      tribe,
      villages,
      tags: event.tags.map(([name, value]) => `${name}=${value}`).join(', '),
    };
  };

  const isLoading = storiesByTribeLoading || storiesByAuthorLoading || recentEventsLoading || allStoriesLoading;

  return (
    <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-900/20 transition-colors">
            <CardTitle className="flex items-center justify-between text-orange-800 dark:text-orange-200">
              <div className="flex items-center gap-2">
                <Bug className="h-5 w-5" />
                Story Debug Info
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-orange-300">
                  {storiesByTribe?.length || 0} stories
                </Badge>
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-6 text-sm">
            <div className="bg-orange-100 dark:bg-orange-900/30 p-3 rounded">
              <p className="font-medium text-orange-800 dark:text-orange-200 mb-2">
                Troubleshooting: If stories show in "Stories by Author" but not in "Stories by Tribe", the tribe tag might be incorrect.
              </p>
              <p className="text-sm text-orange-700 dark:text-orange-300">
                <strong>Fix:</strong> The system now automatically shows all stories from the tribe author when no exact tribe matches are found.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-orange-800 dark:text-orange-200">Current State</h4>
              <div className="bg-white dark:bg-gray-800 p-3 rounded border font-mono text-xs space-y-1">
                <div><strong>Tribe ID:</strong> {tribeId}</div>
                <div><strong>Loading:</strong> {isLoading ? 'Yes' : 'No'}</div>
                <div><strong>Stories:</strong> {storiesByTribe?.length || 0}</div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-orange-800 dark:text-orange-200">Diagnostic Results</h4>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Timestamp: {new Date().toISOString()}
              </div>

              {/* Stories by Tribe */}
              <div className="space-y-2">
                <h5 className="font-medium">Stories by Tribe</h5>
                <div className="bg-white dark:bg-gray-800 p-3 rounded border">
                  <div className="font-mono text-xs mb-2">
                    <strong>{storiesByTribe?.length || 0} events</strong>
                  </div>
                  <div className="font-mono text-xs text-gray-600 dark:text-gray-400 mb-2">
                    Filter: {JSON.stringify({
                      kinds: [30023],
                      '#tribe': [dTag],
                      limit: 10,
                    })}
                  </div>
                  {storiesByTribe && storiesByTribe.length > 0 && (
                    <div className="space-y-1">
                      <div className="font-medium text-xs">Events:</div>
                      {storiesByTribe.map((event) => {
                        const formatted = formatEvent(event);
                        return (
                          <div key={event.id} className="text-xs">
                            • {formatted.id} (kind {formatted.kind}): {formatted.title}
                            <br />
                            <span className="text-gray-600 dark:text-gray-400 ml-2">
                              Tags: {formatted.tags}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Stories by Author */}
              <div className="space-y-2">
                <h5 className="font-medium">Stories by Author</h5>
                <div className="bg-white dark:bg-gray-800 p-3 rounded border">
                  <div className="font-mono text-xs mb-2">
                    <strong>{storiesByAuthor?.length || 0} events</strong>
                  </div>
                  <div className="font-mono text-xs text-gray-600 dark:text-gray-400 mb-2">
                    Filter: {JSON.stringify({
                      kinds: [30023],
                      authors: [pubkey],
                      limit: 10,
                    })}
                  </div>
                  {storiesByAuthor && storiesByAuthor.length > 0 && (
                    <div className="space-y-1">
                      <div className="font-medium text-xs">Events:</div>
                      {storiesByAuthor.map((event) => {
                        const formatted = formatEvent(event);
                        return (
                          <div key={event.id} className="text-xs">
                            • {formatted.id} (kind {formatted.kind}): {formatted.title}
                            <br />
                            <span className="text-gray-600 dark:text-gray-400 ml-2">
                              Tags: {formatted.tags}
                            </span>
                            {formatted.villages.length > 0 && (
                              <>
                                <br />
                                <span className="text-green-600 dark:text-green-400 ml-2">
                                  Villages: {formatted.villages.join(', ')}
                                </span>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Events */}
              <div className="space-y-2">
                <h5 className="font-medium">Recent Events (any kind)</h5>
                <div className="bg-white dark:bg-gray-800 p-3 rounded border">
                  <div className="font-mono text-xs mb-2">
                    <strong>{recentEvents?.length || 0} events</strong>
                  </div>
                  <div className="font-mono text-xs text-gray-600 dark:text-gray-400 mb-2">
                    Filter: {JSON.stringify({
                      authors: [pubkey],
                      limit: 5,
                    })}
                  </div>
                  {recentEvents && recentEvents.length > 0 && (
                    <div className="space-y-1">
                      <div className="font-medium text-xs">Events:</div>
                      {recentEvents.map((event) => {
                        const content = event.content.length > 50
                          ? event.content.substring(0, 50) + '...'
                          : event.content;
                        return (
                          <div key={event.id} className="text-xs">
                            • {event.id.slice(0, 8)} (kind {event.kind}): {content}
                            <br />
                            <span className="text-gray-600 dark:text-gray-400 ml-2">
                              Tags: {event.tags.map(([name, value]) => `${name}=${value}`).join(', ')}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* All Stories */}
              <div className="space-y-2">
                <h5 className="font-medium">All Story Events (any tribe)</h5>
                <div className="bg-white dark:bg-gray-800 p-3 rounded border">
                  <div className="font-mono text-xs mb-2">
                    <strong>{allStories?.length || 0} events</strong>
                  </div>
                  <div className="font-mono text-xs text-gray-600 dark:text-gray-400 mb-2">
                    Filter: {JSON.stringify({
                      kinds: [30023],
                      authors: [pubkey],
                      limit: 10,
                    })}
                  </div>
                  {allStories && allStories.length > 0 && (
                    <div className="space-y-1">
                      <div className="font-medium text-xs">Events:</div>
                      {allStories.map((event) => {
                        const formatted = formatEvent(event);
                        return (
                          <div key={event.id} className="text-xs">
                            • {formatted.id} (kind {formatted.kind}): {formatted.title}
                            <br />
                            <span className="text-gray-600 dark:text-gray-400 ml-2">
                              Tags: {formatted.tags}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}