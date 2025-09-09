import { useTribe } from "@/hooks/useTribes";
import { useTribeEvents } from "@/hooks/useEvents";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { TribeHeader } from "./TribeHeader";
import { TribeEvents } from "./TribeEvents";
import { TribeMembers } from "./TribeMembers";
import { TribeAdminPanel } from "./TribeAdminPanel";
import { TribeServices } from "../services/TribeServices";
import { CreateEventDialog } from "../events/CreateEventDialog";
import { LoginArea } from "@/components/auth/LoginArea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RelaySelector } from "@/components/RelaySelector";
import { Plus, Calendar, Users, Trophy, Settings, HandHeart } from "lucide-react";

interface TribeViewProps {
  tribeId: string;
}

export function TribeView({ tribeId }: TribeViewProps) {
  const { user } = useCurrentUser();
  const { data: tribe, isLoading: tribeLoading, error: tribeError } = useTribe(tribeId);
  const { data: events, isLoading: eventsLoading } = useTribeEvents(tribeId);

  if (tribeLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
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

  if (tribeError || !tribe) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="border-dashed">
          <CardContent className="py-12 px-8 text-center">
            <div className="max-w-sm mx-auto space-y-6">
              <div className="text-4xl">🤷‍♂️</div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Tribe not found</h3>
                <p className="text-muted-foreground">
                  This tribe doesn't exist or isn't available on this relay
                </p>
              </div>
              <RelaySelector className="w-full" />
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

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <TribeHeader tribe={tribe} />

      <Tabs defaultValue="events" className="space-y-6">
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="events" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Events
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
          />
        </TabsContent>

        <TabsContent value="services">
          <TribeServices tribeId={tribeId} />
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