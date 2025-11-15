import { useState } from "react";
import { useNostr } from "@nostrify/react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Bug, Search, CheckCircle, XCircle, AlertCircle, Copy } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { useQuery } from "@tanstack/react-query";

interface DebugEventsDialogProps {
  tribeId: string;
  children?: React.ReactNode;
}

export function DebugEventsDialog({ tribeId, children }: DebugEventsDialogProps) {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  // Parse tribe ID
  const [tribePubkey, tribeDTag] = tribeId.includes(':')
    ? tribeId.split(':')
    : ['', tribeId];

  // Debug queries with detailed logging
  const { data: debugData, isLoading, refetch } = useQuery({
    queryKey: ['debug-events', tribeId, isOpen],
    enabled: isOpen,
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);

      // Check for last created event in sessionStorage
      const lastCreatedEventStr = sessionStorage.getItem('lastCreatedEvent');
      const lastCreatedEvent = lastCreatedEventStr ? JSON.parse(lastCreatedEventStr) : null;

      const results: any = {
        timestamp: new Date().toISOString(),
        tribeId,
        tribePubkey,
        tribeDTag,
        userPubkey: user?.pubkey,
        lastCreatedEvent,
        queries: [],
      };

      // Query 0: If we have last created event, try to find it by ID
      if (lastCreatedEvent?.eventId) {
        try {
          const lastEventById = await nostr.query([{
            kinds: [36959],
            ids: [lastCreatedEvent.eventId],
            limit: 1,
          }], { signal });
          results.queries.push({
            name: '🎯 Last Created Event (by ID)',
            filter: { kinds: [36959], ids: [lastCreatedEvent.eventId], limit: 1 },
            count: lastEventById.length,
            lastCreatedMatch: lastEventById.length > 0,
            events: lastEventById.slice(0, 1).map(e => ({
              id: e.id.slice(0, 8),
              kind: e.kind,
              pubkey: e.pubkey.slice(0, 8),
              dTag: e.tags.find(([n]) => n === 'd')?.[1],
              title: e.tags.find(([n]) => n === 'title')?.[1],
              tribe: e.tags.find(([n]) => n === 'tribe')?.[1],
              created: new Date(e.created_at * 1000).toLocaleString(),
            })),
          });
        } catch (err) {
          results.queries.push({
            name: '🎯 Last Created Event (by ID)',
            error: String(err),
          });
        }
      }

      // Query 1: WORKING STRATEGY - Query by tribe author (matches useTribeEvents)
      if (tribePubkey) {
        try {
          console.log('📡 Debug: Querying all events by tribe author:', tribePubkey.slice(0, 8));
          const allEnhancedEvents = await nostr.query([{
            kinds: [36959],
            authors: [tribePubkey], // Query by tribe owner
            limit: 200,
          }], { signal });

          console.log('📦 Debug: All enhanced events by author:', allEnhancedEvents.length);

          // Filter for events with matching tribe tag
          const filtered = allEnhancedEvents.filter(event => {
            const tribeTags = event.tags.filter(([name]) => name === 'tribe');
            return tribeTags.some(([, value]) => value === tribeDTag || value === tribeId);
          });

          console.log('📦 Debug: Enhanced events matching tribe tag:', filtered.length);

          results.queries.push({
            name: '✅ Enhanced Events (by tribe author - WORKING)',
            filter: { kinds: [36959], authors: [tribePubkey], limit: 200 },
            total: allEnhancedEvents.length,
            filtered: filtered.length,
            events: filtered.slice(0, 5).map(e => ({
              id: e.id.slice(0, 8),
              kind: e.kind,
              pubkey: e.pubkey.slice(0, 8),
              dTag: e.tags.find(([n]) => n === 'd')?.[1],
              title: e.tags.find(([n]) => n === 'title')?.[1],
              tribe: e.tags.find(([n]) => n === 'tribe')?.[1],
              created: new Date(e.created_at * 1000).toLocaleString(),
            })),
          });
        } catch (err) {
          results.queries.push({
            name: '✅ Enhanced Events (by tribe author)',
            error: String(err),
          });
        }
      }

      // Query 5: Legacy events
      if (tribePubkey) {
        try {
          const legacy = await nostr.query([{
            kinds: [31923],
            '#a': [`34550:${tribePubkey}:${tribeDTag}`],
            limit: 50,
          }], { signal });
          results.queries.push({
            name: 'Legacy Events (NIP-52)',
            filter: { kinds: [31923], '#a': [`34550:${tribePubkey}:${tribeDTag}`], limit: 50 },
            count: legacy.length,
            events: legacy.slice(0, 3).map(e => ({
              id: e.id.slice(0, 8),
              kind: e.kind,
              pubkey: e.pubkey.slice(0, 8),
              dTag: e.tags.find(([n]) => n === 'd')?.[1],
              title: e.tags.find(([n]) => n === 'title')?.[1],
              created: new Date(e.created_at * 1000).toLocaleString(),
            })),
          });
        } catch (err) {
          results.queries.push({
            name: 'Legacy Events (NIP-52)',
            error: String(err),
          });
        }
      }

      return results;
    },
  });

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(debugData, null, 2));
    toast({
      title: "Copied!",
      description: "Debug data copied to clipboard",
    });
  };

  const totalEvents = debugData?.queries.reduce((sum: number, q: any) =>
    sum + (q.count || q.filtered || 0), 0) || 0;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <Bug className="h-4 w-4 mr-2" />
            Debug Events
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5" />
            Event Debug Tool
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center justify-between">
                <span>Summary</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => refetch()}>
                    <Search className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                  {debugData && (
                    <Button variant="outline" size="sm" onClick={copyToClipboard}>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy JSON
                    </Button>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Tribe ID:</span>
                  <code className="ml-2 text-xs bg-muted px-1 rounded">{tribeId}</code>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Events Found:</span>
                  <Badge className="ml-2">{isLoading ? '...' : totalEvents}</Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Tribe dTag:</span>
                  <code className="ml-2 text-xs bg-muted px-1 rounded">{tribeDTag}</code>
                </div>
                <div>
                  <span className="text-muted-foreground">Your Pubkey:</span>
                  <code className="ml-2 text-xs bg-muted px-1 rounded">
                    {user?.pubkey?.slice(0, 8) || 'Not logged in'}
                  </code>
                </div>
              </div>

              {/* Last Created Event Info */}
              {debugData?.lastCreatedEvent && (
                <div className="bg-purple-500/10 border border-purple-500/20 p-3 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">🎯 Last Created Event:</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 text-xs"
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(debugData.lastCreatedEvent, null, 2));
                        toast({ title: "Copied!", description: "Last event info copied" });
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                  <div className="text-xs font-mono space-y-1">
                    <div><strong>Title:</strong> {debugData.lastCreatedEvent.title}</div>
                    <div><strong>ID:</strong> {debugData.lastCreatedEvent.eventId?.slice(0, 16)}...</div>
                    <div><strong>dTag:</strong> {debugData.lastCreatedEvent.dTag}</div>
                    <div><strong>Tribe Tag:</strong> {debugData.lastCreatedEvent.tribeTag}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Query Results */}
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-5 w-48" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {debugData?.queries.map((query: any, idx: number) => (
                <Card key={idx}>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      {query.error ? (
                        <XCircle className="h-4 w-4 text-destructive" />
                      ) : (query.count || query.filtered) > 0 ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-yellow-500" />
                      )}
                      {query.name}
                      {!query.error && (
                        <Badge variant="outline">
                          {query.count || query.filtered || 0} events
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Filter used */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Filter:</p>
                      <Textarea
                        value={JSON.stringify(query.filter || query.error, null, 2)}
                        readOnly
                        className="font-mono text-xs h-20"
                      />
                    </div>

                    {/* Sample events */}
                    {query.events && query.events.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">
                          Sample Events ({query.events.length} of {query.count || query.filtered}):
                        </p>
                        <div className="space-y-2">
                          {query.events.map((event: any, i: number) => (
                            <div key={i} className="bg-muted p-2 rounded text-xs font-mono">
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                <div><span className="text-muted-foreground">ID:</span> {event.id}</div>
                                <div><span className="text-muted-foreground">Kind:</span> {event.kind}</div>
                                <div><span className="text-muted-foreground">Pubkey:</span> {event.pubkey}</div>
                                <div><span className="text-muted-foreground">dTag:</span> {event.dTag}</div>
                                <div className="col-span-2">
                                  <span className="text-muted-foreground">Title:</span> {event.title}
                                </div>
                                <div className="col-span-2">
                                  <span className="text-muted-foreground">Tribe:</span> {event.tribe}
                                </div>
                                <div className="col-span-2">
                                  <span className="text-muted-foreground">Created:</span> {event.created}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Totals for client-side filtering */}
                    {query.total !== undefined && (
                      <div className="text-xs text-muted-foreground">
                        Found {query.filtered} matching events out of {query.total} total
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Recommendations */}
          {debugData && totalEvents === 0 && (
            <Card className="border-yellow-500/50 bg-yellow-500/10">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                  No Events Found - Troubleshooting Tips
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="font-medium">Possible causes:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Events haven't been published to Nostr yet (check if publishing is working)</li>
                  <li>Events are on a different relay (try switching relays)</li>
                  <li>Events have different tribe tags than expected</li>
                  <li>The tribe tag format may be inconsistent (dTag vs full ID)</li>
                </ul>
                <p className="font-medium mt-4">Next steps:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Check "Your Enhanced Events" section to see if you created any events</li>
                  <li>Verify the tribe tag in your events matches the expected format</li>
                  <li>Try creating a new test event and check if it appears</li>
                  <li>Check browser console for error messages during event creation</li>
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
