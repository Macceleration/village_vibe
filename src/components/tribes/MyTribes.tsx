import { useMemo } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useMyTribes, usePublicTribes, useTribesCardStatuses } from "@/hooks/useTribes";
import { CreateTribeDialog } from "./CreateTribeDialog";
import { TribeCard } from "./TribeCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RelaySelector } from "@/components/RelaySelector";
import { Plus, Users } from "lucide-react";

export function MyTribes() {
  const { user } = useCurrentUser();
  const { data: myTribes, isLoading: myTribesLoading } = useMyTribes(user?.pubkey);
  const { data: publicTribes, isLoading: publicTribesLoading } = usePublicTribes();

  // Collect all visible tribe IDs to batch the status query
  const allTribeIds = useMemo(() => {
    const ids = new Set<string>();
    myTribes?.forEach(t => {
      const d = t.tags.find(([n]) => n === 'd')?.[1];
      if (d) ids.add(`${t.pubkey}:${d}`);
    });
    publicTribes?.forEach(t => {
      const d = t.tags.find(([n]) => n === 'd')?.[1];
      if (d) ids.add(`${t.pubkey}:${d}`);
    });
    return Array.from(ids);
  }, [myTribes, publicTribes]);

  // One batched query covers all visible cards
  const { data: cardStatuses } = useTribesCardStatuses(allTribeIds, user?.pubkey);

  // Only show loading and content if user is logged in
  if (!user) {
    return null;
  }

  if (publicTribesLoading || myTribesLoading) {
    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const hasMyTribes = myTribes && myTribes.length > 0;
  const hasPublicTribes = publicTribes && publicTribes.length > 0;

  return (
    <div className="space-y-8">
      {/* My Tribes Section */}
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">My Tribes</h2>
            <p className="text-muted-foreground">
              Communities you've created or joined
            </p>
          </div>
          <CreateTribeDialog>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Tribe
            </Button>
          </CreateTribeDialog>
        </div>

        {hasMyTribes ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myTribes.map((tribe) => {
              const d = tribe.tags.find(([n]) => n === 'd')?.[1] || '';
              const tribeId = `${tribe.pubkey}:${d}`;
              return (
                <TribeCard
                  key={tribe.id}
                  tribe={tribe}
                  requestStatus={cardStatuses?.get(tribeId) ?? 'none'}
                />
              );
            })}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-12 px-8 text-center">
              <div className="max-w-sm mx-auto space-y-6">
                <div className="text-4xl">👥</div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">No tribes yet</h3>
                  <p className="text-muted-foreground">
                    Create your first tribe or join existing ones below
                  </p>
                </div>
                <CreateTribeDialog>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Tribe
                  </Button>
                </CreateTribeDialog>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Discover Tribes Section */}
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Discover Tribes</h2>
            <p className="text-muted-foreground">
              Join public communities around your interests
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {publicTribes?.length || 0} tribes
            </span>
          </div>
        </div>

        {hasPublicTribes ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {publicTribes.map((tribe) => {
              const d = tribe.tags.find(([n]) => n === 'd')?.[1] || '';
              const tribeId = `${tribe.pubkey}:${d}`;
              return (
                <TribeCard
                  key={tribe.id}
                  tribe={tribe}
                  requestStatus={cardStatuses?.get(tribeId) ?? 'none'}
                />
              );
            })}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-12 px-8 text-center">
              <div className="max-w-sm mx-auto space-y-6">
                <div className="text-4xl">🔍</div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">No public tribes found</h3>
                  <p className="text-muted-foreground">
                    Try switching to a different relay to discover more communities
                  </p>
                </div>
                <RelaySelector className="w-full" />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
