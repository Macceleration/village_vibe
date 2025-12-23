import { useTribe } from "@/hooks/useTribes";
import { useTribeEvents } from "@/hooks/useEvents";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { TribeHeader } from "./TribeHeader";
import { TribeEvents } from "./TribeEvents";
import { TribeMembers } from "./TribeMembers";
import { TribeAdminPanel } from "./TribeAdminPanel";
import { TribeServices } from "../services/TribeServices";
import { TribeStories } from "../stories/TribeStories";
import { CreateEventDialog } from "../events/CreateEventDialog";
import { LoginArea } from "@/components/auth/LoginArea";
import { RelayStatusIndicator } from "@/components/RelayStatusIndicator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RelaySelector } from "@/components/RelaySelector";
import { Plus, Calendar, Users, Trophy, Settings, HandHeart, BookOpen, RefreshCw } from "lucide-react";

interface TribeViewProps {
  tribeId: string;
}

export function TribeView({ tribeId }: TribeViewProps) {
  const { user } = useCurrentUser();
  const { data: tribe, isLoading: tribeLoading, error: tribeError, failureCount, refetch: refetchTribe } = useTribe(tribeId);
  const { data: events, isLoading: eventsLoading, refetch: refetchEvents } = useTribeEvents(tribeId);

  if (tribeLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Loading Header with Status */}
        <Card className="border-2 border-primary/20">
          <CardContent className="py-8 px-8">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="relative">
                <div className="h-16 w-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Loading Tribe</h2>
                <RelayStatusIndicator />
                <p className="text-muted-foreground text-sm">
                  Fetching tribe details from multiple relays...
                </p>
                {failureCount > 0 && (
                  <div className="mt-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                    <p className="text-sm text-yellow-700 font-medium">
                      Retrying... (attempt {failureCount + 1}/6)
                    </p>
                    <p className="text-xs text-yellow-600 mt-1">
                      Querying 4 relays with 20s timeout per attempt
                    </p>
                    {failureCount >= 1 && (
                      <p className="text-xs text-yellow-600 mt-1">
                        ⏱️ Relays are slow - this is normal, please wait
                      </p>
                    )}
                    {failureCount >= 3 && (
                      <p className="text-xs text-yellow-600 mt-1 font-medium">
                        💡 Try clicking Refresh or switching relays if this persists
                      </p>
                    )}
                  </div>
                )}
                {!failureCount && (
                  <p className="text-xs text-muted-foreground">
                    Usually loads within 2-5 seconds
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Skeleton Content */}
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-8 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (tribeError || (!tribe && !tribeLoading)) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="border-dashed">
          <CardContent className="py-12 px-8 text-center">
            <div className="max-w-sm mx-auto space-y-6">
              <div className="text-4xl">🤷‍♂️</div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Tribe not found</h3>
                <p className="text-muted-foreground">
                  This tribe doesn't exist or isn't available on the current relays
                </p>
                {failureCount > 0 && (
                  <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                    <p className="text-sm text-red-700 font-medium">
                      Failed after {failureCount + 1} attempts across 4 relays
                    </p>
                    <p className="text-xs text-red-600 mt-1">
                      The tribe definition (kind 34550) could not be retrieved
                    </p>
                    <p className="text-xs text-red-600 mt-1">
                      Try clicking "Try Again" or switching to the Ditto relay
                    </p>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <Button onClick={() => refetchTribe()} variant="outline" className="w-full">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <div className="text-xs text-muted-foreground">
                  Try switching to a different relay:
                </div>
                <RelaySelector className="w-full" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if user is a moderator/admin
  const userRole = tribe.tags.find(([name, pubkey, , role]) =>
    name === 'p' && pubkey === user?.pubkey && (role === 'admin' || role === 'moderator')
  )?.[3];

  const canCreateEvents = !!userRole;
  const isAdmin = userRole === 'admin';
  const isModerator = userRole === 'moderator' || isAdmin;

  // Function to force refresh all tribe data
  const handleRefreshAll = async () => {
    // Force refetch with cache bypass
    await refetchTribe();
    await refetchEvents();
  };

  const isRefreshing = tribeFetching || eventsFetching;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefreshAll}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      <TribeHeader tribe={tribe} />

      <Tabs defaultValue="events" className="space-y-6">
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="events" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Events
            </TabsTrigger>
            <TabsTrigger value="stories" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Stories
            </TabsTrigger>
            <TabsTrigger value="services" className="flex items-center gap-2">
              <HandHeart className="h-4 w-4" />
              Services
            </TabsTrigger>
            <TabsTrigger value="members" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Members
            </TabsTrigger>
            <TabsTrigger value="badges" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Badges
            </TabsTrigger>
            {isModerator && (
              <TabsTrigger value="admin" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Admin
              </TabsTrigger>
            )}
          </TabsList>

          {canCreateEvents && (
            <CreateEventDialog tribeId={tribeId}>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Event
              </Button>
            </CreateEventDialog>
          )}
        </div>

        <TabsContent value="events">
          <TribeEvents
            events={events || []}
            isLoading={eventsLoading}
            canCreateEvents={canCreateEvents}
            tribeId={tribeId}
            isModerator={isModerator}
            villageSlug={tribe.tags.find(([name]) => name === 'village')?.[1]}
          />
        </TabsContent>

        <TabsContent value="stories">
          <TribeStories
            tribeId={tribeId}
            tribe={tribe}
            canCreateStories={!!user} // Any logged-in user can create stories
            isModerator={isModerator}
            villageSlug={tribe.tags.find(([name]) => name === 'village')?.[1]}
          />
        </TabsContent>

        <TabsContent value="services">
          <TribeServices tribeId={tribeId} isModerator={isModerator} />
        </TabsContent>

        <TabsContent value="members">
          {user ? (
            <TribeMembers tribe={tribe} />
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-12 px-8 text-center">
                <div className="max-w-sm mx-auto space-y-6">
                  <div className="text-4xl">🔒</div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Login Required</h3>
                    <p className="text-muted-foreground">
                      Please log in to view tribe members
                    </p>
                  </div>
                  <LoginArea className="max-w-60" />
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="badges">
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🏆</div>
            <h3 className="text-lg font-semibold mb-2">Tribe Badges</h3>
            <p className="text-muted-foreground">
              Badge system coming soon! Earn badges by attending events.
            </p>
          </div>
        </TabsContent>

        {isModerator && (
          <TabsContent value="admin">
            <TribeAdminPanel tribe={tribe} tribeId={tribeId} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}