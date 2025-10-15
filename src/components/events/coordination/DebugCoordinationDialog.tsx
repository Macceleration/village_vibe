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
import { COORDINATION_KINDS } from "@/hooks/useEventCoordination";
import type { NostrEvent } from "@nostrify/nostrify";

interface DebugCoordinationDialogProps {
  event: NostrEvent;
  children?: React.ReactNode;
}

export function DebugCoordinationDialog({ event, children }: DebugCoordinationDialogProps) {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  // Debug queries with detailed logging
  const { data: debugData, isLoading, refetch } = useQuery({
    queryKey: ['debug-coordination', event.id, isOpen],
    enabled: isOpen,
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      const results: any = {
        timestamp: new Date().toISOString(),
        eventId: event.id,
        eventKind: event.kind,
        eventPubkey: event.pubkey,
        eventDTag: event.tags.find(([n]) => n === 'd')?.[1],
        userPubkey: user?.pubkey,
        queries: [],
      };

      // Query all coordination kinds
      const kindNames = [
        { kind: COORDINATION_KINDS.ROLE, name: 'Roles' },
        { kind: COORDINATION_KINDS.ROLE_CLAIM, name: 'Role Claims' },
        { kind: COORDINATION_KINDS.ITEM, name: 'Items' },
        { kind: COORDINATION_KINDS.ITEM_CLAIM, name: 'Item Claims' },
        { kind: COORDINATION_KINDS.ACTION, name: 'Actions' },
        { kind: COORDINATION_KINDS.ACTION_UPDATE, name: 'Action Updates' },
        { kind: COORDINATION_KINDS.OUTCOME, name: 'Outcomes' },
      ];

      for (const { kind, name } of kindNames) {
        try {
          const events = await nostr.query([{
            kinds: [kind],
            '#e': [event.id],
            limit: 50,
          }], { signal });

          results.queries.push({
            name,
            kind,
            filter: { kinds: [kind], '#e': [event.id], limit: 50 },
            count: events.length,
            events: events.slice(0, 3).map(e => ({
              id: e.id.slice(0, 8),
              kind: e.kind,
              pubkey: e.pubkey.slice(0, 8),
              dTag: e.tags.find(([n]) => n === 'd')?.[1],
              title: e.tags.find(([n]) => n === 'title')?.[1],
              status: e.tags.find(([n]) => n === 'status')?.[1],
              created: new Date(e.created_at * 1000).toLocaleString(),
              tags: e.tags,
            })),
          });
        } catch (err) {
          results.queries.push({
            name,
            kind,
            error: String(err),
          });
        }
      }

      // Also query by author to see all user's coordination events
      if (user?.pubkey) {
        try {
          const userEvents = await nostr.query([{
            kinds: Object.values(COORDINATION_KINDS),
            authors: [user.pubkey],
            limit: 50,
          }], { signal });

          results.queries.push({
            name: 'Your Coordination Events (All)',
            filter: { kinds: Object.values(COORDINATION_KINDS), authors: [user.pubkey], limit: 50 },
            count: userEvents.length,
            events: userEvents.slice(0, 5).map(e => ({
              id: e.id.slice(0, 8),
              kind: e.kind,
              pubkey: e.pubkey.slice(0, 8),
              dTag: e.tags.find(([n]) => n === 'd')?.[1],
              eventRef: e.tags.find(([n]) => n === 'e')?.[1]?.slice(0, 8),
              created: new Date(e.created_at * 1000).toLocaleString(),
              allTags: e.tags,
            })),
          });
        } catch (err) {
          results.queries.push({
            name: 'Your Coordination Events',
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

  const totalObjects = debugData?.queries.reduce((sum: number, q: any) => 
    sum + (q.count || 0), 0) || 0;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <Bug className="h-4 w-4 mr-2" />
            Debug Coordination
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5" />
            Coordination Debug Tool
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
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Event ID:</span>
                  <code className="ml-2 text-xs bg-muted px-1 rounded">{event.id.slice(0, 16)}...</code>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Objects Found:</span>
                  <Badge className="ml-2">{isLoading ? '...' : totalObjects}</Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Event Kind:</span>
                  <code className="ml-2 text-xs bg-muted px-1 rounded">{event.kind}</code>
                </div>
                <div>
                  <span className="text-muted-foreground">Your Pubkey:</span>
                  <code className="ml-2 text-xs bg-muted px-1 rounded">
                    {user?.pubkey?.slice(0, 8) || 'Not logged in'}
                  </code>
                </div>
              </div>
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
                      ) : query.count > 0 ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-yellow-500" />
                      )}
                      {query.name}
                      {query.kind && (
                        <Badge variant="outline" className="ml-2">
                          Kind {query.kind}
                        </Badge>
                      )}
                      {!query.error && (
                        <Badge variant="outline">
                          {query.count || 0} events
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
                          Sample Events ({query.events.length} of {query.count}):
                        </p>
                        <div className="space-y-2">
                          {query.events.map((event: any, i: number) => (
                            <div key={i} className="bg-muted p-2 rounded text-xs font-mono">
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                <div><span className="text-muted-foreground">ID:</span> {event.id}</div>
                                <div><span className="text-muted-foreground">Kind:</span> {event.kind}</div>
                                <div><span className="text-muted-foreground">Pubkey:</span> {event.pubkey}</div>
                                <div><span className="text-muted-foreground">dTag:</span> {event.dTag}</div>
                                {event.title && (
                                  <div className="col-span-2">
                                    <span className="text-muted-foreground">Title:</span> {event.title}
                                  </div>
                                )}
                                {event.status && (
                                  <div><span className="text-muted-foreground">Status:</span> {event.status}</div>
                                )}
                                {event.eventRef && (
                                  <div><span className="text-muted-foreground">Event Ref:</span> {event.eventRef}</div>
                                )}
                                <div className="col-span-2">
                                  <span className="text-muted-foreground">Created:</span> {event.created}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Recommendations */}
          {debugData && totalObjects === 0 && (
            <Card className="border-yellow-500/50 bg-yellow-500/10">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                  No Coordination Objects Found - Troubleshooting Tips
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="font-medium">Possible causes:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>No roles, items, or actions have been created yet</li>
                  <li>Objects were created but not published to the relay</li>
                  <li>Objects are on a different relay (try switching relays)</li>
                  <li>Objects reference a different event ID</li>
                </ul>
                <p className="font-medium mt-4">Next steps:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Try creating a test role or item using the dialogs</li>
                  <li>Check browser console for publishing errors</li>
                  <li>Verify the event ID matches (shown in summary above)</li>
                  <li>Check "Your Coordination Events" to see if you've created any</li>
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
