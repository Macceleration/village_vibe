import { useState } from 'react';
import { useNostr } from '@nostrify/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useTribeServices } from '@/hooks/useServices';
import { ChevronDown, ChevronRight, Bug, RefreshCw } from 'lucide-react';
import type { NostrEvent } from '@nostrify/nostrify';

interface ServiceDebugProps {
  tribeId: string;
  className?: string;
}

export function ServiceDebug({ tribeId, className }: ServiceDebugProps) {
  const { nostr } = useNostr();
  const [isOpen, setIsOpen] = useState(false);
  const [debugInfo, setDebugInfo] = useState<{
    tribeId: string;
    pubkey: string;
    dTag: string;
    timestamp: string;
    queries: Array<{
      name: string;
      filter: Record<string, unknown>;
      success: boolean;
      eventCount?: number;
      events?: Array<{
        id: string;
        kind: number;
        created_at: number;
        content: string;
        tags: string[][];
      }>;
      error?: string;
    }>;
    events: NostrEvent[];
  } | null>(null);
  const { data: services, isLoading, error, refetch } = useTribeServices(tribeId);

  const runDiagnostics = async () => {
    const [pubkey, dTag] = tribeId.split(':');

    const diagnostics = {
      tribeId,
      pubkey,
      dTag,
      timestamp: new Date().toISOString(),
      queries: [] as Array<{
        name: string;
        filter: Record<string, unknown>;
        success: boolean;
        eventCount?: number;
        events?: Array<{
          id: string;
          kind: number;
          created_at: number;
          content: string;
          tags: string[][];
        }>;
        error?: string;
      }>,
      events: [] as NostrEvent[],
    };

    try {
      // Test different query variations
      const queries = [
        {
          name: 'Service Offers',
          filter: { kinds: [38857], '#tribe': [dTag], limit: 10 },
        },
        {
          name: 'Service Requests',
          filter: { kinds: [30627], '#tribe': [dTag], limit: 10 },
        },
        {
          name: 'All Services',
          filter: { kinds: [38857, 30627], '#tribe': [dTag], limit: 20 },
        },
        {
          name: 'Services by Author',
          filter: { kinds: [38857, 30627], authors: [pubkey], limit: 10 },
        },
        {
          name: 'Recent Events (any kind)',
          filter: { authors: [pubkey], limit: 5 },
        },
        {
          name: 'All Service Events (any tribe)',
          filter: { kinds: [38857, 30627], authors: [pubkey], limit: 10 },
        },
      ];

      for (const query of queries) {
        try {
          const events = await nostr.query([query.filter], {
            signal: AbortSignal.timeout(3000)
          });

          diagnostics.queries.push({
            ...query,
            success: true,
            eventCount: events.length,
            events: events.map(e => ({
              id: e.id.slice(0, 8),
              kind: e.kind,
              created_at: e.created_at,
              content: e.content.slice(0, 50),
              tags: e.tags.slice(0, 5),
            })),
          });

          if (events.length > 0) {
            diagnostics.events.push(...events);
          }
        } catch (err) {
          diagnostics.queries.push({
            ...query,
            success: false,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    } catch (err) {
      console.error('Diagnostics error:', err);
    }

    setDebugInfo(diagnostics);
  };

  return (
    <Card className={className}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50">
            <CardTitle className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Bug className="h-4 w-4" />
                Service Debug Info
                <Badge variant="outline" className="text-xs">
                  {services?.length || 0} services
                </Badge>
              </div>
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button size="sm" onClick={runDiagnostics}>
                  Run Diagnostics
                </Button>
                <Button size="sm" variant="outline" onClick={() => refetch()}>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Refresh
                </Button>
              </div>

              <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
                <strong>Troubleshooting:</strong> If services show in "Services by Author" but not in "All Services",
                the tribe tag might be incorrect. Try creating a new service to test the fix.
              </div>

              {/* Current State */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Current State</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>Tribe ID: <code className="bg-muted px-1 rounded">{tribeId}</code></div>
                  <div>Loading: <Badge variant={isLoading ? 'default' : 'secondary'}>{String(isLoading)}</Badge></div>
                  <div>Error: <Badge variant={error ? 'destructive' : 'secondary'}>{error ? 'Yes' : 'No'}</Badge></div>
                  <div>Services: <Badge>{services?.length || 0}</Badge></div>
                </div>

                {error && (
                  <div className="p-2 bg-destructive/10 rounded text-xs">
                    <strong>Error:</strong> {error.message}
                  </div>
                )}
              </div>

              {/* Services List */}
              {services && services.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Found Services</h4>
                  <div className="space-y-1">
                    {services.map((service) => (
                      <div key={service.id} className="p-2 bg-muted rounded text-xs">
                        <div className="flex justify-between items-start">
                          <div>
                            <Badge className="text-xs mb-1">
                              Kind {service.kind}
                            </Badge>
                            <div className="font-mono text-xs opacity-70">
                              {service.id.slice(0, 16)}...
                            </div>
                          </div>
                          <div className="text-right text-xs opacity-70">
                            {new Date(service.created_at * 1000).toLocaleString()}
                          </div>
                        </div>
                        <div className="mt-1">{service.content}</div>
                        <div className="mt-1 text-xs opacity-70">
                          Tags: {service.tags.map(([name, value]) => `${name}=${value}`).join(', ')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Diagnostic Results */}
              {debugInfo && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Diagnostic Results</h4>
                  <div className="text-xs space-y-2">
                    <div>
                      <strong>Timestamp:</strong> {debugInfo.timestamp}
                    </div>

                    {debugInfo.queries.map((query, i: number) => (
                      <div key={i} className="p-2 bg-muted rounded">
                        <div className="flex justify-between items-center mb-1">
                          <strong>{query.name}</strong>
                          <Badge variant={query.success ? 'default' : 'destructive'}>
                            {query.success ? `${query.eventCount} events` : 'Failed'}
                          </Badge>
                        </div>

                        <div className="font-mono text-xs opacity-70 mb-1">
                          Filter: {JSON.stringify(query.filter)}
                        </div>

                        {query.error && (
                          <div className="text-destructive text-xs">
                            Error: {query.error}
                          </div>
                        )}

                        {query.events && query.events.length > 0 && (
                          <div className="mt-1">
                            <div className="text-xs opacity-70 mb-1">Events:</div>
                            {query.events.map((event, j: number) => (
                              <div key={j} className="text-xs opacity-80 ml-2">
                                • {event.id} (kind {event.kind}): {event.content}
                                <div className="text-xs opacity-60 ml-2">
                                  Tags: {event.tags.map(([name, value]) => `${name}=${value}`).slice(0, 5).join(', ')}
                                  {event.tags.length > 5 && '...'}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}