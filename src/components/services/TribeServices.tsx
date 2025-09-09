import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ServiceCard } from './ServiceCard';
import { ServiceFilters } from './ServiceFilters';
import { CreateServiceDialog } from './CreateServiceDialog';
import { ServiceDebug } from './ServiceDebug';
import { RelaySelector } from '@/components/RelaySelector';
import { useTribeServices, type ServiceFilters as ServiceFiltersType } from '@/hooks/useServices';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { LoginArea } from '@/components/auth/LoginArea';
import { Plus, HandHeart, HelpCircle, Filter } from 'lucide-react';

interface TribeServicesProps {
  tribeId: string;
  className?: string;
}

export function TribeServices({ tribeId, className }: TribeServicesProps) {
  const { user } = useCurrentUser();
  const [activeTab, setActiveTab] = useState<'offers' | 'requests'>('offers');
  const [filters, setFilters] = useState<ServiceFiltersType>({});
  const [showFilters, setShowFilters] = useState(false);

  // Get user location for distance calculations (simplified)
  const [userLocation] = useState<{ lat: number; lon: number } | undefined>(
    { lat: 42.3314, lon: -83.0458 } // Default to Detroit - TODO: implement geolocation API
  );

  const { data: services, isLoading, error } = useTribeServices(tribeId, {
    ...filters,
    type: activeTab === 'offers' ? 'offer' : 'request',
  });

  // Filter services based on active filters
  const filteredServices = useMemo(() => {
    if (!services) return [];

    let filtered = [...services];

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(service =>
        service.content.toLowerCase().includes(searchLower) ||
        service.tags.find(([name, value]) =>
          name === 'area' && value?.toLowerCase().includes(searchLower)
        )
      );
    }

    // Apply distance filter (simplified)
    if (filters.distance && userLocation) {
      const maxDistance = filters.distance === '3blocks' ? 0.1 :
                         filters.distance === '0.5mi' ? 0.5 : 1;

      filtered = filtered.filter(service => {
        const locationTag = service.tags.find(([name]) => name === 'l')?.[1];
        if (!locationTag) return false;

        const [lat, lon] = locationTag.split(',').map(Number);
        const distance = Math.sqrt(
          Math.pow(lat - userLocation.lat, 2) + Math.pow(lon - userLocation.lon, 2)
        ) * 69; // Rough miles conversion

        return distance <= maxDistance;
      });
    }

    // Apply time/availability filter
    if (filters.when) {
      filtered = filtered.filter(service => {
        const availTag = service.tags.find(([name]) => name === 'avail')?.[1];
        const timeTag = service.tags.find(([name]) => name === 'time')?.[1];
        const timeText = (availTag || timeTag || '').toLowerCase();
        return timeText.includes(filters.when!.toLowerCase());
      });
    }

    // Apply trusted filter (simplified - TODO: implement badge/reputation checking)
    if (filters.trusted) {
      // For now, just return all services - TODO: filter by badges/labels
    }

    return filtered.sort((a, b) => b.created_at - a.created_at);
  }, [services, filters, userLocation]);

  const offers = filteredServices.filter(s => s.kind === 38857);
  const requests = filteredServices.filter(s => s.kind === 30627);

  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-1 flex-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-4/5" />
                  <div className="flex gap-2 pt-2">
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !services) {
    return (
      <div className={`${className}`}>
        <Card className="border-dashed">
          <CardContent className="py-12 px-8 text-center">
            <div className="max-w-sm mx-auto space-y-6">
              <div className="text-4xl">🤷‍♂️</div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">No services found</h3>
                <p className="text-muted-foreground">
                  No services available on this relay. Try switching relays?
                </p>
              </div>
              <RelaySelector className="w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-2xl font-bold">Services</h2>
          <p className="text-muted-foreground">
            Community help and services
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>

          {user && (
            <CreateServiceDialog tribeId={tribeId} defaultType={activeTab === 'offers' ? 'offer' : 'request'}>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create {activeTab === 'offers' ? 'Offer' : 'Request'}
              </Button>
            </CreateServiceDialog>
          )}
        </div>
      </div>

      {/* Debug Info */}
      <ServiceDebug tribeId={tribeId} />

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <ServiceFilters
              filters={filters}
              onFiltersChange={setFilters}
            />
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'offers' | 'requests')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="offers" className="flex items-center gap-2">
            <HandHeart className="h-4 w-4" />
            Offers
            {offers.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {offers.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="requests" className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4" />
            Requests
            {requests.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {requests.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="offers" className="space-y-4">
          {offers.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 px-8 text-center">
                <div className="max-w-sm mx-auto space-y-6">
                  <div className="text-4xl">🤝</div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">No offers yet</h3>
                    <p className="text-muted-foreground">
                      Be the first to offer help to your community!
                    </p>
                  </div>
                  {user ? (
                    <CreateServiceDialog tribeId={tribeId} defaultType="offer">
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Offer
                      </Button>
                    </CreateServiceDialog>
                  ) : (
                    <LoginArea className="max-w-60" />
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {offers.map((service) => (
                <ServiceCard
                  key={service.id}
                  event={service}
                  userLocation={userLocation}
                  tribeId={tribeId}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          {requests.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 px-8 text-center">
                <div className="max-w-sm mx-auto space-y-6">
                  <div className="text-4xl">🙏</div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">No requests yet</h3>
                    <p className="text-muted-foreground">
                      Be the first to ask for help from your community!
                    </p>
                  </div>
                  {user ? (
                    <CreateServiceDialog tribeId={tribeId} defaultType="request">
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Request
                      </Button>
                    </CreateServiceDialog>
                  ) : (
                    <LoginArea className="max-w-60" />
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {requests.map((service) => (
                <ServiceCard
                  key={service.id}
                  event={service}
                  userLocation={userLocation}
                  tribeId={tribeId}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}