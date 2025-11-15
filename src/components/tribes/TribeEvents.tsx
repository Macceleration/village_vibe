import type { NostrEvent } from "@nostrify/nostrify";
import { EventCard } from "../events/EventCard";
import { CreateEventDialog } from "../events/CreateEventDialog";
import { DebugEventsDialog } from "../events/DebugEventsDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, Bug } from "lucide-react";

interface TribeEventsProps {
  events: NostrEvent[];
  isLoading: boolean;
  canCreateEvents: boolean;
  tribeId: string;
  isModerator?: boolean;
}

export function TribeEvents({ events, isLoading, canCreateEvents, tribeId, isModerator = false }: TribeEventsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="space-y-4">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-8 w-24" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Separate past and upcoming events
  const now = Date.now() / 1000;
  const upcomingEvents = events.filter(event => {
    const startTime = parseInt(event.tags.find(([name]) => name === 'start')?.[1] || '0');
    const endTime = parseInt(event.tags.find(([name]) => name === 'end')?.[1] || '0');

    // Event is upcoming if it hasn't ended + 1 hour grace period
    const eventEndWithGrace = (endTime || startTime + 3600) + 3600; // +1 hour grace
    return eventEndWithGrace > now;
  }).sort((a, b) => {
    const aStart = parseInt(a.tags.find(([name]) => name === 'start')?.[1] || '0');
    const bStart = parseInt(b.tags.find(([name]) => name === 'start')?.[1] || '0');
    return aStart - bStart;
  });

  const pastEvents = events.filter(event => {
    const startTime = parseInt(event.tags.find(([name]) => name === 'start')?.[1] || '0');
    const endTime = parseInt(event.tags.find(([name]) => name === 'end')?.[1] || '0');

    // Event is past if it has ended + 1 hour grace period
    const eventEndWithGrace = (endTime || startTime + 3600) + 3600; // +1 hour grace
    return eventEndWithGrace <= now;
  }).sort((a, b) => {
    const aStart = parseInt(a.tags.find(([name]) => name === 'start')?.[1] || '0');
    const bStart = parseInt(b.tags.find(([name]) => name === 'start')?.[1] || '0');
    return bStart - aStart; // Most recent first
  });

  return (
    <div className="space-y-8">
      {/* Debug Button - Fixed bottom right */}
      <div className="fixed bottom-4 right-4 z-50">
        <DebugEventsDialog tribeId={tribeId}>
          <Button size="sm" variant="outline" className="shadow-lg">
            <Bug className="h-4 w-4 mr-2" />
            Debug ({events.length})
          </Button>
        </DebugEventsDialog>
      </div>

      {events.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 px-8 text-center">
            <div className="max-w-sm mx-auto space-y-6">
              <div className="text-4xl">📅</div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">No events yet</h3>
                <p className="text-muted-foreground">
                  {canCreateEvents
                    ? "Create the first event for this tribe"
                    : "This tribe hasn't scheduled any events yet"
                  }
                </p>
              </div>
              {canCreateEvents && (
                <CreateEventDialog tribeId={tribeId}>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Event
                  </Button>
                </CreateEventDialog>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Upcoming Events */}
          {upcomingEvents.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                <h3 className="text-xl font-semibold">Upcoming Events</h3>
                <span className="text-sm text-muted-foreground">({upcomingEvents.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {upcomingEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    showModerationActions={isModerator}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Past Events */}
          {pastEvents.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-xl font-semibold text-muted-foreground">Past Events</h3>
                <span className="text-sm text-muted-foreground">({pastEvents.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pastEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    isPast
                    showModerationActions={isModerator}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}