import { useState } from "react";
import type { NostrEvent } from "@nostrify/nostrify";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useNostrPublish } from "@/hooks/useNostrPublish";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/useToast";
import { Loader2 } from "lucide-react";

interface EventRSVPProps {
  event: NostrEvent;
  userRSVP?: NostrEvent | null;
  eventId: string;
}

export function EventRSVP({ event, userRSVP, eventId }: EventRSVPProps) {
  const { user } = useCurrentUser();
  const { mutate: createEvent, isPending: isSubmitting } = useNostrPublish();
  const { toast } = useToast();

  const [note, setNote] = useState('');

  const currentStatus = userRSVP?.tags.find(([name]) => name === 'status')?.[1];

  // Check if event has passed (after duration + 1 hour grace period)
  const startTime = parseInt(event.tags.find(([name]) => name === 'start')?.[1] || '0') * 1000;
  const endTime = parseInt(event.tags.find(([name]) => name === 'end')?.[1] || '0') * 1000;
  const eventEnd = endTime || startTime + (60 * 60 * 1000); // Default 1 hour if no end time
  const eventEndWithGrace = eventEnd + (60 * 60 * 1000); // +1 hour grace period
  const isPast = Date.now() > eventEndWithGrace;

  const handleRSVP = async (status: 'accepted' | 'tentative' | 'declined') => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to RSVP",
        variant: "destructive",
      });
      return;
    }

    try {
      // Generate unique identifier for RSVP
      const dTag = `rsvp-${eventId}-${user.pubkey}`;

      const tags = [
        ['d', dTag],
        ['a', `${event.kind}:${eventId}`], // Reference to event using its actual kind
        ['e', event.id], // Reference to specific event revision
        ['p', event.pubkey], // Event author
        ['status', status],
      ];

      // Add free/busy status (only for accepted/tentative)
      if (status !== 'declined') {
        tags.push(['fb', 'busy']);
      }

      createEvent({
        kind: 31925, // Calendar Event RSVP (NIP-52)
        content: note.trim(),
        tags,
      });

      const statusEmojis = {
        accepted: '✅',
        tentative: '🤔',
        declined: '❌'
      };

      toast({
        title: `${statusEmojis[status]} RSVP Updated!`,
        description: `You're ${status === 'accepted' ? 'going' : status === 'tentative' ? 'maybe going' : 'not going'} to this event`,
      });

      setNote('');
    } catch (error) {
      console.error('Error submitting RSVP:', error);
      toast({
        title: "Error",
        description: "Failed to submit RSVP. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🎫 RSVP
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            Log in to RSVP for this event
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isPast) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🎫 RSVP
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            This event has already passed
          </p>
          {currentStatus && (
            <div className="text-sm">
              Your RSVP: <strong>
                {currentStatus === 'accepted' ? '✅ Going' :
                 currentStatus === 'tentative' ? '🤔 Maybe' : '❌ Not Going'}
              </strong>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🎫 RSVP for this Event
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {currentStatus && (
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-sm font-medium">Current RSVP:</div>
            <div className="text-lg">
              {currentStatus === 'accepted' ? '✅ Going' :
               currentStatus === 'tentative' ? '🤔 Maybe' : '❌ Not Going'}
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="rsvp-note">Add a note (optional)</Label>
            <Textarea
              id="rsvp-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Let others know why you're excited to attend!"
              rows={3}
            />
          </div>
        </div>

        <div className="space-y-3">
          <Button
            onClick={() => handleRSVP('accepted')}
            disabled={isSubmitting}
            className="w-full"
            variant={currentStatus === 'accepted' ? 'default' : 'outline'}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              '✅'
            )}
            Going
          </Button>

          <Button
            onClick={() => handleRSVP('tentative')}
            disabled={isSubmitting}
            className="w-full"
            variant={currentStatus === 'tentative' ? 'default' : 'outline'}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              '🤔'
            )}
            Maybe
          </Button>

          <Button
            onClick={() => handleRSVP('declined')}
            disabled={isSubmitting}
            className="w-full"
            variant={currentStatus === 'declined' ? 'destructive' : 'outline'}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              '❌'
            )}
            Can't Go
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}