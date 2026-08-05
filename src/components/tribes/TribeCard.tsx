import { Link } from "react-router-dom";
import type { NostrEvent } from "@nostrify/nostrify";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useJoinTribe } from "@/hooks/useTribesActions";
import { useNostr } from '@nostrify/react';
import { useQueryClient } from '@tanstack/react-query';
import type { TribeRequestStatus } from "@/hooks/useTribes";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Users, UserPlus, Loader2, Clock, X } from "lucide-react";

interface TribeCardProps {
  tribe: NostrEvent;
  /** Pre-computed from the batched useTribesCardStatuses query in MyTribes. */
  requestStatus: TribeRequestStatus;
}

export function TribeCard({ tribe, requestStatus }: TribeCardProps) {
  const { user } = useCurrentUser();
  const { nostr } = useNostr();
  const queryClient = useQueryClient();
  const { joinTribe, isPending: isJoining } = useJoinTribe();

  const dTag = tribe.tags.find(([name]) => name === 'd')?.[1] || '';
  const tribeId = `${tribe.pubkey}:${dTag}`;

  const nameTag = tribe.tags.find(([name]) => name === 'name')?.[1];
  const descriptionTag = tribe.tags.find(([name]) => name === 'description')?.[1];
  const imageTag = tribe.tags.find(([name]) => name === 'image')?.[1];
  const locationTag = tribe.tags.find(([name]) => name === 'location')?.[1];

  const tribeName = nameTag || dTag;

  // Compute member count locally — no extra query needed
  const memberCount = new Set(
    tribe.tags
      .filter(([name, pubkey]) => name === 'p' && Boolean(pubkey))
      .map(([, pubkey]) => pubkey),
  ).size;

  // Check if tribe is public/private and open/closed
  const isPublic = tribe.tags.some(([name]) => name === 'public');
  const isOpen = tribe.tags.some(([name]) => name === 'open');

  // Check if user is already a member
  const isMember = user && tribe.tags.some(([name, pubkey]) => name === 'p' && pubkey === user.pubkey);
  const isCreator = user?.pubkey === tribe.pubkey;

  const hasExistingRequest = requestStatus === 'pending';
  const hasBeenRejected = requestStatus === 'rejected';

  // Prefetch tribe data on hover for instant loading
  const prefetchTribe = () => {
    queryClient.prefetchQuery({
      queryKey: ['tribe', tribeId],
      queryFn: async () => {
        const [pubkey, d] = tribeId.split(':');
        const events = await nostr.query([
          {
            kinds: [34550],
            authors: [pubkey],
            '#d': [d],
            limit: 1,
          }
        ], { signal: AbortSignal.timeout(10000) });
        return events[0] || null;
      },
      staleTime: 5 * 60 * 1000,
    });
  };

  const getJoinButtonContent = () => {
    if (isJoining) {
      return (
        <>
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          Joining...
        </>
      );
    }

    if (hasBeenRejected) {
      return (
        <>
          <X className="h-3 w-3 mr-1" />
          Rejected
        </>
      );
    }

    if (hasExistingRequest) {
      return (
        <>
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </>
      );
    }

    return (
      <>
        <UserPlus className="h-3 w-3 mr-1" />
        Join
      </>
    );
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center space-x-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={imageTag} alt={tribeName} />
            <AvatarFallback>
              {tribeName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{tribeName}</h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={isPublic ? "default" : "secondary"} className="text-xs">
                {isPublic ? "Public" : "Private"}
              </Badge>
              <Badge variant={isOpen ? "default" : "outline"} className="text-xs">
                {isOpen ? "Open" : "Closed"}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {descriptionTag && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {descriptionTag}
          </p>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span>{memberCount} {memberCount === 1 ? 'member' : 'members'}</span>
            </div>
            {locationTag && (
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                <span className="truncate max-w-20">{locationTag}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            asChild
            size="sm"
            variant="outline"
            className="flex-1"
            onMouseEnter={prefetchTribe}
            onFocus={prefetchTribe}
          >
            <Link to={`/tribe/${tribeId}`}>
              <Calendar className="h-3 w-3 mr-1" />
              View
            </Link>
          </Button>

          {user && !isMember && !isCreator && (
            <Button
              size="sm"
              onClick={() => joinTribe(tribe)}
              disabled={isJoining || hasExistingRequest || hasBeenRejected}
              variant={hasExistingRequest ? "secondary" : hasBeenRejected ? "destructive" : "default"}
              className="flex-1"
            >
              {getJoinButtonContent()}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
