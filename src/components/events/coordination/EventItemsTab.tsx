import { useState } from "react";
import type { NostrEvent } from "@nostrify/nostrify";
import { useEventItems } from "@/hooks/useEventCoordination";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Package } from "lucide-react";
import { CreateItemDialog } from "./CreateItemDialog";
import { ItemCard } from "./ItemCard";

interface EventItemsTabProps {
  event: NostrEvent;
  canManage: boolean;
}

export function EventItemsTab({ event, canManage }: EventItemsTabProps) {
  const { data: items, isLoading } = useEventItems(event.id);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  console.log('📦 EventItemsTab render:', {
    eventId: event.id,
    itemsCount: items?.length,
    isLoading,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  const neededItems = items?.filter(i => i.claimed < i.quantity) || [];
  const fullyClaimedItems = items?.filter(i => i.claimed >= i.quantity) || [];

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
        <>
          {/* Items Still Needed */}
          {neededItems.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold">Items Needed ({neededItems.length})</h3>
              {neededItems.map(item => (
                <ItemCard
                  key={item.id}
                  item={item}
                  event={event}
                  canManage={canManage}
                />
              ))}
            </div>
          )}

          {/* Fully Claimed Items */}
          {fullyClaimedItems.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold">Fully Claimed ({fullyClaimedItems.length})</h3>
              {fullyClaimedItems.map(item => (
                <ItemCard
                  key={item.id}
                  item={item}
                  event={event}
                  canManage={canManage}
                />
              ))}
            </div>
          )}
        </>
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
