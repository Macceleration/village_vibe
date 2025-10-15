import type { NostrEvent } from "@nostrify/nostrify";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useClaimRole, useRoleClaims, type EventRole } from "@/hooks/useEventCoordination";
import { useNostrPublish } from "@/hooks/useNostrPublish";
import { useAuthor } from "@/hooks/useAuthor";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/useToast";
import { Users, Clock, AlertCircle } from "lucide-react";
import { genUserName } from "@/lib/genUserName";

interface RoleCardProps {
  role: EventRole;
  event: NostrEvent;
  canManage: boolean;
}

export function RoleCard({ role, event, canManage }: RoleCardProps) {
  const { user } = useCurrentUser();
  const { data: claims, isLoading: claimsLoading } = useRoleClaims(role.id, event.id);
  const { mutate: claimRole, isPending: isClaiming } = useClaimRole();
  const { mutateAsync: publish } = useNostrPublish();
  const { toast } = useToast();

  console.log('🎴 RoleCard render:', {
    roleId: role.id,
    roleTitle: role.title,
    claimsData: claims,
    claimsLoading,
  });

  const activeClaims = claims?.filter(c => c.status === 'active') || [];
  const userClaim = activeClaims.find(c => c.claimedBy === user?.pubkey);
  const filledCount = role.filled || activeClaims.length; // Use role.filled from aggregated query or count claims
  const spotsLeft = role.slots - filledCount;

  console.log('📊 Role stats:', {
    roleId: role.id,
    slots: role.slots,
    filledFromRole: role.filled,
    claimsLength: activeClaims.length,
    finalFilledCount: filledCount,
    spotsLeft,
  });

  const handleClaim = async () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to claim this role",
        variant: "destructive",
      });
      return;
    }

    console.log('🎯 Claiming role:', {
      roleId: role.id,
      roleTitle: role.title,
      eventId: event.id,
      userPubkey: user.pubkey,
    });

    claimRole({
      roleId: role.id,
      roleEventId: event.id,
      eventId: event.id,
    }, {
      onSuccess: async (result) => {
        console.log('✅ Claim data created:', {
          claimId: result.claimId,
          kind: result.eventData.kind,
          tags: result.eventData.tags,
        });

        try {
          console.log('📤 Publishing claim to Nostr...');
          const published = await publish(result.eventData);
          console.log('✅ Claim published successfully:', {
            id: published.id,
            claimId: result.claimId,
          });
          toast({
            title: "Success",
            description: "You've claimed this role!",
          });
        } catch (err) {
          console.error('Failed to publish claim:', err);
          toast({
            title: "Error",
            description: "Failed to publish claim to relay",
            variant: "destructive",
          });
        }
      },
      onError: (err) => {
        console.error('Failed to claim role:', err);
        toast({
          title: "Error",
          description: "Failed to claim role",
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
                <h3 className="font-semibold">{role.title}</h3>
                {role.status === 'filled' && (
                  <Badge variant="secondary">Filled</Badge>
                )}
                {role.requirements && (
                  <Badge variant="outline" className="gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Requirements
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{role.description}</p>
            </div>
          </div>

          {/* Info */}
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span className="font-medium">{filledCount}/{role.slots} filled</span>
              {spotsLeft > 0 && (
                <span className="text-green-600 font-medium">({spotsLeft} left)</span>
              )}
              {spotsLeft === 0 && (
                <span className="text-orange-600 font-medium">(Full)</span>
              )}
            </div>

            {(role.timeStart || role.timeEnd) && (
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {role.timeStart && new Date(role.timeStart * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {role.timeStart && role.timeEnd && ' - '}
                {role.timeEnd && new Date(role.timeEnd * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>

          {role.requirements && (
            <div className="text-sm bg-muted p-3 rounded-lg">
              <strong>Requirements:</strong> {role.requirements}
            </div>
          )}

          {/* Claims */}
          {activeClaims.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Volunteers:</div>
              <div className="flex flex-wrap gap-2">
                {activeClaims.map(claim => (
                  <ClaimAvatar key={claim.id} pubkey={claim.claimedBy} />
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          {!userClaim && spotsLeft > 0 && (
            <Button
              onClick={handleClaim}
              disabled={isClaiming || !user}
              className="w-full"
            >
              {user ? 'Claim This Role' : 'Login to Claim'}
            </Button>
          )}

          {userClaim && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-center text-sm text-green-700">
              ✓ You've claimed this role
            </div>
          )}

          {spotsLeft === 0 && !userClaim && (
            <div className="bg-muted rounded-lg p-3 text-center text-sm text-muted-foreground">
              All spots filled
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ClaimAvatar({ pubkey }: { pubkey: string }) {
  const { data: author } = useAuthor(pubkey);
  const metadata = author?.metadata;
  const displayName = metadata?.name || genUserName(pubkey);
  const avatarUrl = metadata?.picture;

  return (
    <div className="flex items-center gap-2 bg-muted rounded-full pl-1 pr-3 py-1">
      <Avatar className="h-6 w-6">
        <AvatarImage src={avatarUrl} alt={displayName} />
        <AvatarFallback>{displayName[0]?.toUpperCase()}</AvatarFallback>
      </Avatar>
      <span className="text-sm">{displayName}</span>
    </div>
  );
}
