import type { NostrEvent } from "@nostrify/nostrify";
import { useState } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useClaimItem, type EventItem, type ItemClaim } from "@/hooks/useEventCoordination";
import { useNostrPublish } from "@/hooks/useNostrPublish";
import { useAuthor } from "@/hooks/useAuthor";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/useToast";
import { Package, MessageSquare } from "lucide-react";
import { genUserName } from "@/lib/genUserName";

interface ItemCardProps {
  item: EventItem;
  event: NostrEvent;
  canManage: boolean;
  /** Active + withdrawn claims for this item, passed from the parent tab (no extra query). */
  claims: ItemClaim[];
}

export function ItemCard({ item, event, canManage, claims }: ItemCardProps) {
  const { user } = useCurrentUser();
  const { mutate: claimItem, isPending: isClaiming } = useClaimItem();
  const { mutateAsync: publish } = useNostrPublish();
  const { toast } = useToast();
  const [showClaimDialog, setShowClaimDialog] = useState(false);
  const [claimQty, setClaimQty] = useState('1');
  const [claimNotes, setClaimNotes] = useState('');

  const dTag = event.tags.find(([n]) => n === 'd')?.[1] ?? '';

  const activeClaims = claims.filter(c => c.status === 'active');
  const userClaims = activeClaims.filter(c => c.claimedBy === user?.pubkey);
  const userClaimedQty = userClaims.reduce((sum, c) => sum + c.quantity, 0);
  // Use item.claimed (computed by batched query) as primary source; fall back to local sum
  const claimedCount = item.claimed || activeClaims.reduce((sum, c) => sum + c.quantity, 0);
  const qtyLeft = item.quantity - claimedCount;

  const handleClaim = async () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to claim this item",
        variant: "destructive",
      });
      return;
    }

    const quantity = parseInt(claimQty) || 1;
    if (quantity <= 0 || quantity > qtyLeft) {
      toast({
        title: "Error",
        description: `Please enter a valid quantity (1-${qtyLeft})`,
        variant: "destructive",
      });
      return;
    }

    claimItem({
      itemId: item.id,
      itemEventId: event.id,
      eventId: event.id,
      eventKind: event.kind,
      eventAuthor: event.pubkey,
      eventDTag: dTag,
      quantity,
      notes: claimNotes.trim() || undefined,
    }, {
      onSuccess: async (result) => {
        try {
          await publish(result.eventData);
          toast({
            title: "Success",
            description: `You've claimed ${quantity} ${item.unit || 'item'}${quantity > 1 ? 's' : ''}!`,
          });
          setShowClaimDialog(false);
          setClaimQty('1');
          setClaimNotes('');
        } catch (err) {
          console.error('Failed to publish item claim:', err);
          toast({
            title: "Error",
            description: "Failed to publish claim to relay",
            variant: "destructive",
          });
        }
      },
      onError: (err) => {
        console.error('Failed to claim item:', err);
        toast({
          title: "Error",
          description: "Failed to claim item",
          variant: "destructive",
        });
      },
    });
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold">{item.title}</h3>
                {item.category && (
                  <Badge variant="outline">{item.category}</Badge>
                )}
                {qtyLeft === 0 && (
                  <Badge variant="secondary">Complete</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </div>
          </div>

          {/* Quantity Info */}
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Package className="h-4 w-4" />
              <span className="font-medium">{claimedCount}/{item.quantity}</span>
              {item.unit && <span> {item.unit}{item.quantity > 1 ? 's' : ''}</span>}
              {qtyLeft > 0 && (
                <span className="text-green-600 font-medium">({qtyLeft} left)</span>
              )}
              {qtyLeft === 0 && (
                <span className="text-orange-600 font-medium">(All claimed)</span>
              )}
            </div>
          </div>

          {/* Claims */}
          {activeClaims.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Claimed by:</div>
              <div className="space-y-1">
                {activeClaims.map(claim => (
                  <ClaimRow key={claim.id} claim={claim} item={item} />
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          {qtyLeft > 0 && (
            <Dialog open={showClaimDialog} onOpenChange={setShowClaimDialog}>
              <DialogTrigger asChild>
                <Button
                  disabled={!user}
                  className="w-full"
                >
                  {user ? 'Claim This Item' : 'Login to Claim'}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Claim {item.title}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="quantity">How many will you bring?</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      max={qtyLeft}
                      value={claimQty}
                      onChange={(e) => setClaimQty(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      {qtyLeft} {item.unit || 'item'}{qtyLeft > 1 ? 's' : ''} still needed
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Input
                      id="notes"
                      value={claimNotes}
                      onChange={(e) => setClaimNotes(e.target.value)}
                      placeholder="Any details or preferences..."
                    />
                  </div>

                  <div className="flex gap-3 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowClaimDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleClaim} disabled={isClaiming}>
                      {isClaiming ? 'Claiming...' : 'Confirm Claim'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {userClaimedQty > 0 && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-center text-sm text-green-700">
              ✓ You've claimed {userClaimedQty} {item.unit || 'item'}{userClaimedQty > 1 ? 's' : ''}
            </div>
          )}

          {qtyLeft === 0 && !userClaimedQty && (
            <div className="bg-muted rounded-lg p-3 text-center text-sm text-muted-foreground">
              All items claimed
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ClaimRow({ claim, item }: { claim: ItemClaim; item: EventItem }) {
  const { data: author } = useAuthor(claim.claimedBy);
  const metadata = author?.metadata;
  const displayName = metadata?.name || genUserName(claim.claimedBy);
  const avatarUrl = metadata?.picture;

  return (
    <div className="flex items-center justify-between bg-muted rounded-lg p-2">
      <div className="flex items-center gap-2">
        <Avatar className="h-6 w-6">
          <AvatarImage src={avatarUrl} alt={displayName} />
          <AvatarFallback>{displayName[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        <span className="text-sm">{displayName}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">
          {claim.quantity} {item.unit || 'item'}{claim.quantity > 1 ? 's' : ''}
        </span>
        {claim.notes && (
          <Badge variant="outline" className="gap-1">
            <MessageSquare className="h-3 w-3" />
          </Badge>
        )}
      </div>
    </div>
  );
}
