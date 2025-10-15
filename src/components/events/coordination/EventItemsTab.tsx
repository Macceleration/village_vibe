import { useState } from "react";
import type { NostrEvent } from "@nostrify/nostrify";
import { useEventItems } from "@/hooks/useEventCoordination";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Plus, Package } from "lucide-react";
import { CreateItemDialog } from "./CreateItemDialog";

interface EventItemsTabProps {
  event: NostrEvent;
  canManage: boolean;
}

export function EventItemsTab({ event, canManage }: EventItemsTabProps) {
  const { data: items, isLoading } = useEventItems(event.id);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Items Needed</h2>
          <p className="text-sm text-muted-foreground">
            Things to bring or provide for this event
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        )}
      </div>

      {!items || items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-semibold mb-2">No Items Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {canManage
                ? "Add items people can bring or provide"
                : "No items have been added yet"}
            </p>
            {canManage && (
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Item
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map(item => (
            <Card key={item.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{item.title}</h3>
                      {item.category && (
                        <Badge variant="outline">{item.category}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                    <div className="mt-2 text-sm font-medium">
                      <span>{item.quantity}</span>
                      {item.unit && <span className="text-muted-foreground"> {item.unit}</span>}
                      <span className="text-muted-foreground"> needed</span>
                    </div>
                  </div>
                  <Button size="sm">Claim</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {canManage && (
        <CreateItemDialog
          event={event}
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
        />
      )}
    </div>
  );
}
