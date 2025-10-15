import { useState } from "react";
import type { NostrEvent } from "@nostrify/nostrify";
import { useEventOutcomes } from "@/hooks/useEventCoordination";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Plus, Trophy, TrendingUp, MessageSquare, Image as ImageIcon } from "lucide-react";
import { CreateOutcomeDialog } from "./CreateOutcomeDialog";

interface EventOutcomesTabProps {
  event: NostrEvent;
  canManage: boolean;
}

export function EventOutcomesTab({ event, canManage }: EventOutcomesTabProps) {
  const { data: outcomes, isLoading } = useEventOutcomes(event.id);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  const getOutcomeIcon = (type: string) => {
    switch (type) {
      case 'metric': return <TrendingUp className="h-4 w-4" />;
      case 'story': return <MessageSquare className="h-4 w-4" />;
      case 'photo': return <ImageIcon className="h-4 w-4" />;
      case 'feedback': return <MessageSquare className="h-4 w-4" />;
      default: return <Trophy className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Event Outcomes</h2>
          <p className="text-sm text-muted-foreground">
            Results, impact, and memories from this event
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Outcome
          </Button>
        )}
      </div>

      {!outcomes || outcomes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-semibold mb-2">No Outcomes Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {canManage
                ? "Record the impact and results after the event"
                : "Outcomes will be shared after the event"}
            </p>
            {canManage && (
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Record First Outcome
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {outcomes.map(outcome => (
            <Card key={outcome.id}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    {getOutcomeIcon(outcome.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold">{outcome.title}</h3>
                      <Badge variant="outline">{outcome.type}</Badge>
                    </div>
                    {outcome.value !== undefined && (
                      <div className="text-2xl font-bold mb-2">
                        {outcome.value} {outcome.unit}
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {outcome.content}
                    </p>
                    {outcome.mediaUrl && (
                      <div className="mt-4">
                        <img
                          src={outcome.mediaUrl}
                          alt={outcome.title}
                          className="rounded-lg max-h-64 object-cover"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {canManage && (
        <CreateOutcomeDialog
          event={event}
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
        />
      )}
    </div>
  );
}
