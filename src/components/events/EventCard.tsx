import { Link } from "react-router-dom";
import type { NostrEvent } from "@nostrify/nostrify";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EventModerationDialog } from "./EventModerationDialog";
import { TribeName } from '@/components/tribes/TribeName';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, MapPin, Clock, Users, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface EventCardProps {
  event: NostrEvent;
  isPast?: boolean;
  showModerationActions?: boolean;
}

export function EventCard({ event, isPast = false, showModerationActions = false }: EventCardProps) {
  const { user } = useCurrentUser();
  const dTag = event.tags.find(([name]) => name === 'd')?.[1] || '';
  const titleTag = event.tags.find(([name]) => name === 'title')?.[1];
  const summaryTag = event.tags.find(([name]) => name === 'summary')?.[1];
  const imageTag = event.tags.find(([name]) => name === 'image')?.[1];
  const locationTag = event.tags.find(([name]) => name === 'location')?.[1];
  const startTag = event.tags.find(([name]) => name === 'start')?.[1];
  const endTag = event.tags.find(([name]) => name === 'end')?.[1];

  const eventTitle = titleTag || 'Untitled Event';
  const eventId = `${event.pubkey}:${dTag}`;

  // Parse timestamps
  const startTime = startTag ? new Date(parseInt(startTag) * 1000) : null;
  const endTime = endTag ? new Date(parseInt(endTag) * 1000) : null;

  // Format date and time
  const formatEventTime = () => {
    if (!startTime) return 'Time TBD';

    const now = new Date();
    const isToday = startTime.toDateString() === now.toDateString();
    const isTomorrow = startTime.toDateString() === new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString();

    let dateStr = '';
    if (isToday) {
      dateStr = 'Today';
    } else if (isTomorrow) {
      dateStr = 'Tomorrow';
    } else {
      dateStr = startTime.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    }

    const timeStr = startTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    return `${dateStr} at ${timeStr}`;
  };

  return (
    <Card className={cn(
      "hover:shadow-lg transition-shadow",
      isPast && "opacity-75"
    )}>
      <CardHeader className="pb-3">
        <div className="space-y-3">
          {imageTag && (
            <div className="aspect-video rounded-lg overflow-hidden bg-muted">
              <img
                src={imageTag}
                alt={eventTitle}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold line-clamp-2 flex-1">{eventTitle}</h3>
              {isPast && (
                <Badge variant="secondary" className="text-xs">
                  Past
                </Badge>
              )}
            </div>

            {summaryTag && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {summaryTag}
              </p>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{formatEventTime()}</span>
          </div>

          {locationTag && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span className="truncate">{locationTag}</span>
            </div>
          )}

          {endTime && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                Duration: {Math.round((endTime.getTime() - (startTime?.getTime() || 0)) / (1000 * 60))} min
              </span>
            </div>
          )}
        </div>

        {/* Tribe tag */}
        {(() => {
          const tribeTag = event.tags.find(([name]) => name === 'tribe')?.[1];
          return tribeTag ? (
            <div className="flex gap-2">
              <TribeName tribeTag={tribeTag} />
            </div>
          ) : null;
        })()}

        <div className="flex gap-2">
          <Button asChild size="sm" className="flex-1">
            <Link to={`/event/${eventId}`}>
              <Users className="h-3 w-3 mr-1" />
              {isPast ? 'View' : 'RSVP'}
            </Link>
          </Button>

          {showModerationActions && user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <EventModerationDialog event={event}>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    Promote to Villages
                  </DropdownMenuItem>
                </EventModerationDialog>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardContent>
    </Card>
  );
}