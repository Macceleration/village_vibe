
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ProfileZapDialog } from '@/components/ProfileZapDialog';
import { DMDialog } from '@/components/DMDialog';
import { ServiceModerationDialog } from './ServiceModerationDialog';
import { useAuthor } from '@/hooks/useAuthor';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useUserBadgeAwards } from '@/hooks/useBadges';
import { useCreateServiceMatch } from '@/hooks/useServices';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useTribe } from '@/hooks/useTribes';
import { extractServiceData, formatDistance, calculateDistance } from '@/hooks/useServices';
import { genUserName } from '@/lib/genUserName';
import {
  MapPin,
  Clock,
  DollarSign,
  MessageCircle,
  Zap,
  HandHeart,
  HelpCircle,
  Shield
} from 'lucide-react';
import type { NostrEvent } from '@nostrify/nostrify';

interface ServiceCardProps {
  event: NostrEvent;
  userLocation?: { lat: number; lon: number };
  className?: string;
  tribeId?: string; // For checking admin status
  showModerationControls?: boolean;
}

export function ServiceCard({ event, userLocation, className, tribeId, showModerationControls = false }: ServiceCardProps) {
  const { user } = useCurrentUser();
  const author = useAuthor(event.pubkey);
  const { data: badges } = useUserBadgeAwards(event.pubkey);
  const { mutate: createMatch } = useCreateServiceMatch();
  const { mutate: publishEvent } = useNostrPublish();

  // Check if user is admin/moderator of this tribe
  const { data: tribe } = useTribe(tribeId || '');
  const userRole = tribe?.tags.find(([name, pubkey, , role]) =>
    name === 'p' && pubkey === user?.pubkey && (role === 'admin' || role === 'moderator')
  )?.[3];
  const isAdmin = userRole === 'admin';
  const isModerator = userRole === 'moderator' || isAdmin;


  const serviceData = extractServiceData(event);
  const metadata = author.data?.metadata;
  const displayName = metadata?.name ?? genUserName(event.pubkey);
  const profileImage = metadata?.picture;

  // Calculate distance if user location is available
  let distance: string | undefined;
  if (userLocation && serviceData.location) {
    const [lat, lon] = serviceData.location.split(',').map(Number);
    const miles = calculateDistance(userLocation.lat, userLocation.lon, lat, lon);
    distance = formatDistance(miles);
  }

  const isOffer = event.kind === 38857;

  // Check if user has badges/trust indicators
  const hasBadges = badges && badges.length > 0;

  const handleMatch = () => {
    if (!user) return;

    const serviceRef = `${event.kind}:${event.pubkey}:${serviceData.dTag}`;

    createMatch({
      [isOffer ? 'offerARef' : 'requestARef']: serviceRef,
      type: isOffer ? 'request_to_offer' : 'offer_to_request',
      message: isOffer ? 'I need this service' : 'I can help with this',
    }, {
      onSuccess: (result) => {
        publishEvent(result.eventData);
      },
    });
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'yardwork': return '🌱';
      case 'pets': return '🐕';
      case 'eldercare': return '👵';
      case 'errands': return '🏃';
      case 'oddjobs': return '🔧';
      default: return '❓';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'yardwork': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'pets': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'eldercare': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'errands': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'oddjobs': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3 flex-1">
            <Avatar className="h-10 w-10">
              <AvatarImage src={profileImage} alt={displayName} />
              <AvatarFallback>{displayName.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm truncate">{displayName}</p>
                {hasBadges && (
                  <div className="flex gap-1">
                    {badges.slice(0, 2).map((badge, i) => (
                      <Badge key={i} variant="secondary" className="text-xs px-1.5 py-0.5">
                        🏆
                      </Badge>
                    ))}
                    {badges.length > 2 && (
                      <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                        +{badges.length - 2}
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 mt-1">
                <Badge className={`text-xs ${getCategoryColor(serviceData.category)}`}>
                  {getCategoryIcon(serviceData.category)} {serviceData.category}
                </Badge>

                {distance && (
                  <div className="flex items-center text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3 mr-1" />
                    {distance}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <p className="text-sm mb-3 leading-relaxed">{serviceData.content}</p>

        {/* Service details */}
        <div className="space-y-2 mb-4">
          {serviceData.area && (
            <div className="flex items-center text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 mr-2" />
              {serviceData.area}
            </div>
          )}

          {(serviceData.availability || serviceData.timeWindow) && (
            <div className="flex items-center text-xs text-muted-foreground">
              <Clock className="h-3 w-3 mr-2" />
              {serviceData.availability || serviceData.timeWindow}
            </div>
          )}

          {serviceData.rate && (
            <div className="flex items-center text-xs text-muted-foreground">
              <DollarSign className="h-3 w-3 mr-2" />
              {serviceData.rate}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DMDialog recipientPubkey={event.pubkey} recipientName={displayName}>
              <Button size="sm" variant="outline">
                <MessageCircle className="h-4 w-4 mr-1" />
                DM
              </Button>
            </DMDialog>

            <ProfileZapDialog
              recipientPubkey={event.pubkey}
              recipientName={displayName}
              recipientLud16={metadata?.lud16}
            >
              <Button size="sm" variant="outline">
                <Zap className="h-4 w-4 mr-1" />
                Zap
              </Button>
            </ProfileZapDialog>
          </div>

          <div className="flex items-center gap-2">
            {/* Admin moderation controls */}
            {(showModerationControls || isModerator) && (
              <ServiceModerationDialog serviceEvent={event}>
                <Button size="sm" variant="outline" className="text-destructive hover:text-destructive">
                  <Shield className="h-4 w-4" />
                </Button>
              </ServiceModerationDialog>
            )}

            {/* User action button */}
            {user && user.pubkey !== event.pubkey && (
              <Button
                size="sm"
                onClick={handleMatch}
                className="flex items-center gap-1"
              >
                {isOffer ? (
                  <>
                    <HelpCircle className="h-4 w-4" />
                    I need this
                  </>
                ) : (
                  <>
                    <HandHeart className="h-4 w-4" />
                    I can help
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}