import { useEvent, useEventRSVPs, useUserRSVP, useEventAttendance } from "@/hooks/useEvents";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { EventHeader } from "./EventHeader";
import { EventRSVP } from "./EventRSVP";
import { EventAttendeeList } from "./EventAttendeeList";
import { EventCheckIn } from "./EventCheckIn";
import { AttendeeCheckIn } from "./AttendeeCheckIn";
import { EventDiscussion } from "./EventDiscussion";
import { EventCoordinationTabs } from "./EventCoordinationTabs";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RelaySelector } from "@/components/RelaySelector";
import { Users, QrCode, Trophy, MessageCircle, ClipboardList } from "lucide-react";

interface EventViewProps {
  eventId: string;
}

export function EventView({ eventId }: EventViewProps) {
  const { user } = useCurrentUser();
  const { data: event, isLoading: eventLoading, error: eventError } = useEvent(eventId);
  const { data: rsvps, isLoading: rsvpsLoading } = useEventRSVPs(eventId);
  const { data: userRSVP } = useUserRSVP(eventId, user?.pubkey);
  const { data: attendanceRecords } = useEventAttendance(eventId);

  if (eventLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="space-y-4">
          <Skeleton className="h-64 w-full rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (eventError || !event) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="border-dashed">
          <CardContent className="py-12 px-8 text-center">
            <div className="max-w-sm mx-auto space-y-6">
              <div className="text-4xl">🤷‍♂️</div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Event not found</h3>
                <p className="text-muted-foreground">
                  This event doesn't exist or isn't available on this relay
                </p>
              </div>
              <RelaySelector className="w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if user is the event host
  const isHost = user?.pubkey === event.pubkey;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <EventHeader event={event} userRSVP={userRSVP} />

      <Tabs defaultValue="coordination" className="space-y-6">
        <TabsList>
          <TabsTrigger value="coordination" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Coordination
          </TabsTrigger>
          <TabsTrigger value="rsvp" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            RSVP & Attendees
          </TabsTrigger>
          <TabsTrigger value="discussion" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Discussion
          </TabsTrigger>
          {isHost && (
            <TabsTrigger value="checkin" className="flex items-center gap-2">
              <QrCode className="h-4 w-4" />
              Check-In
            </TabsTrigger>
          )}
          <TabsTrigger value="badges" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Badges
          </TabsTrigger>
        </TabsList>

        <TabsContent value="coordination">
          <EventCoordinationTabs
            event={event}
            isOrganizer={isHost}
            isModerator={false}
          />
        </TabsContent>

        <TabsContent value="rsvp">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <EventRSVP
                event={event}
                userRSVP={userRSVP}
                eventId={eventId}
              />
              <AttendeeCheckIn
                event={event}
                eventId={eventId}
              />
            </div>
            <div className="lg:col-span-2">
              <EventAttendeeList
                rsvps={rsvps || []}
                isLoading={rsvpsLoading}
                attendanceRecords={attendanceRecords || []}
              />
            </div>
          </div>
        </TabsContent>

        {isHost && (
          <TabsContent value="checkin">
            <EventCheckIn eventId={eventId} event={event} />
          </TabsContent>
        )}

        <TabsContent value="discussion">
          <EventDiscussion event={event} />
        </TabsContent>

        <TabsContent value="badges">
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🏆</div>
            <h3 className="text-lg font-semibold mb-2">Event Badges</h3>
            <p className="text-muted-foreground">
              Attendance badges will be shown here after the event.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}