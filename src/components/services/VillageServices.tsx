import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ServiceCard } from './ServiceCard';
import { ServiceFilters } from './ServiceFilters';
import { RelaySelector } from '@/components/RelaySelector';
import { useVillageServices, type ServiceFilters as ServiceFiltersType } from '@/hooks/useServices';
import { useTribe } from '@/hooks/useTribes';
import { Filter, MapPin } from 'lucide-react';
import type { NostrEvent } from '@nostrify/nostrify';

interface VillageServicesProps {
  villageSlug: string;
  className?: string;
}

export function VillageServices({ villageSlug, className }: VillageServicesProps) {
  const [filters, setFilters] = useState<ServiceFiltersType>({});
  const [showFilters, setShowFilters] = useState(false);

  const { data: services, isLoading, error } = useVillageServices(villageSlug, filters);

  // Get user location for distance calculations (simplified)
  const [userLocation] = useState<{ lat: number; lon: number } | undefined>(
    { lat: 42.3314, lon: -83.0458 } // Default to Detroit
  );

  // Group services by tribe for display
  const servicesByTribe = services?.reduce((acc, service) => {
    const tribeTag = service.tags.find(([name]) => name === 'tribe')?.[1];
    if (!tribeTag) return acc;

    if (!acc[tribeTag]) {
      acc[tribeTag] = [];
    }
    acc[tribeTag].push(service);
    return acc;
  }, {} as Record<string, typeof services>) || {};

  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-24" />
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
                  No services available in this village on this relay.
                </p>
              </div>
              <RelaySelector className="w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalServices = services.length;
  const offers = services.filter(s => s.kind === 38857).length;
  const requests = services.filter(s => s.kind === 30627).length;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-2xl font-bold capitalize">{villageSlug.replace('-', ' ')}</h2>
          </div>
          <p className="text-muted-foreground">
            {totalServices} service{totalServices !== 1 ? 's' : ''} available
          </p>
          <div className="flex gap-2 mt-2">
            <Badge variant="outline">{offers} offer{offers !== 1 ? 's' : ''}</Badge>
            <Badge variant="outline">{requests} request{requests !== 1 ? 's' : ''}</Badge>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </Button>
      </div>

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

      {/* Services grouped by tribe */}
      {Object.keys(servicesByTribe).length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 px-8 text-center">
            <div className="max-w-sm mx-auto space-y-6">
              <div className="text-4xl">🏘️</div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">No services match your filters</h3>
                <p className="text-muted-foreground">
                  Try adjusting your filters or check back later.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(servicesByTribe).map(([tribeSlug, tribeServices]) => (
            <TribeServiceSection
              key={tribeSlug}
              tribeSlug={tribeSlug}
              services={tribeServices}
              userLocation={userLocation}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface TribeServiceSectionProps {
  tribeSlug: string;
  services: NostrEvent[];
  userLocation?: { lat: number; lon: number };
}

function TribeServiceSection({ tribeSlug, services, userLocation }: TribeServiceSectionProps) {
  // Get tribe info for display
  const { data: tribe } = useTribe(tribeSlug);
  const tribeName = tribe?.tags.find(([name]) => name === 'name')?.[1] ||
                   tribe?.tags.find(([name]) => name === 'd')?.[1] ||
                   tribeSlug;

  const offers = services.filter(s => s.kind === 38857);
  const requests = services.filter(s => s.kind === 30627);

  return (
    <div className="space-y-4">
      {/* Tribe header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{tribeName}</h3>
          <div className="flex gap-2 mt-1">
            <Badge variant="secondary" className="text-xs">
              {offers.length} offer{offers.length !== 1 ? 's' : ''}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {requests.length} request{requests.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>
      </div>

      {/* Services grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services
          .sort((a, b) => b.created_at - a.created_at)
          .map((service) => (
            <ServiceCard
              key={service.id}
              event={service}
              userLocation={userLocation}
            />
          ))}
      </div>
    </div>
  );
}