import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ServiceModerationDialog } from './ServiceModerationDialog';
import { AdminMatchDialog } from './AdminMatchDialog';
import { useTribeServices } from '@/hooks/useServices';
import { useAuthor } from '@/hooks/useAuthor';
import { extractServiceData } from '@/hooks/useServices';
import { genUserName } from '@/lib/genUserName';
import {
  Shield,
  Link,
  Search,
  MapPin,
  Clock,
  HandHeart,
  HelpCircle
} from 'lucide-react';
import type { NostrEvent } from '@nostrify/nostrify';

interface AdminServicesPanelProps {
  tribeId: string;
  className?: string;
}

export function AdminServicesPanel({ tribeId, className }: AdminServicesPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOffer, setSelectedOffer] = useState<NostrEvent | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<NostrEvent | null>(null);

  const { data: services, isLoading } = useTribeServices(tribeId);

  // Filter services by search term
  const filteredOffers = useMemo(() => {
    const offers = services?.filter(s => s.kind === 38857) || [];
    if (!searchTerm) return offers;
    return offers.filter(service =>
      service.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.tags.some(([name, value]) =>
        name === 'area' && value?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [services, searchTerm]);

  const filteredRequests = useMemo(() => {
    const requests = services?.filter(s => s.kind === 30627) || [];
    if (!searchTerm) return requests;
    return requests.filter(service =>
      service.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.tags.some(([name, value]) =>
        name === 'area' && value?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [services, searchTerm]);

  const canCreateMatch = selectedOffer && selectedRequest;

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Loading services...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Service Moderation & Matching
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search services..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Match creation section */}
          {canCreateMatch && (
            <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Link className="h-4 w-4 text-amber-600" />
                    <span className="text-sm font-medium">Ready to suggest match</span>
                  </div>
                  <div className="flex gap-2">
                    <AdminMatchDialog
                      offerEvent={selectedOffer}
                      requestEvent={selectedRequest}
                    >
                      <Button size="sm">
                        <Link className="h-4 w-4 mr-1" />
                        Suggest Match
                      </Button>
                    </AdminMatchDialog>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedOffer(null);
                        setSelectedRequest(null);
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Services tabs */}
          <Tabs defaultValue="offers">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="offers" className="flex items-center gap-2">
                <HandHeart className="h-4 w-4" />
                Offers ({filteredOffers.length})
              </TabsTrigger>
              <TabsTrigger value="requests" className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4" />
                Requests ({filteredRequests.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="offers" className="space-y-3">
              {filteredOffers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No offers found
                </div>
              ) : (
                filteredOffers.map((offer) => (
                  <AdminServiceCard
                    key={offer.id}
                    service={offer}
                    isSelected={selectedOffer?.id === offer.id}
                    onSelect={() => setSelectedOffer(offer)}
                    onDeselect={() => setSelectedOffer(null)}
                    type="offer"
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="requests" className="space-y-3">
              {filteredRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No requests found
                </div>
              ) : (
                filteredRequests.map((request) => (
                  <AdminServiceCard
                    key={request.id}
                    service={request}
                    isSelected={selectedRequest?.id === request.id}
                    onSelect={() => setSelectedRequest(request)}
                    onDeselect={() => setSelectedRequest(null)}
                    type="request"
                  />
                ))
              )}
            </TabsContent>
          </Tabs>

          <div className="text-xs text-muted-foreground p-3 bg-muted rounded">
            <strong>Instructions:</strong>
            <ul className="mt-1 space-y-1">
              <li>• Select one offer and one request to suggest a match</li>
              <li>• Use the shield button to moderate inappropriate services</li>
              <li>• Moderation actions create NIP-32 labels for transparency</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface AdminServiceCardProps {
  service: NostrEvent;
  isSelected: boolean;
  onSelect: () => void;
  onDeselect: () => void;
  type: 'offer' | 'request';
}

function AdminServiceCard({ service, isSelected, onSelect, onDeselect, type }: AdminServiceCardProps) {
  const author = useAuthor(service.pubkey);
  const serviceData = extractServiceData(service);
  const displayName = author.data?.metadata?.name ?? genUserName(service.pubkey);

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
    <Card
      className={`cursor-pointer transition-colors ${
        isSelected
          ? 'border-primary bg-primary/5'
          : 'hover:bg-muted/50'
      }`}
      onClick={isSelected ? onDeselect : onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <Avatar className="h-8 w-8">
              <AvatarImage src={author.data?.metadata?.picture} alt={displayName} />
              <AvatarFallback className="text-xs">
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-medium text-sm truncate">{displayName}</p>
                <Badge className={`text-xs ${getCategoryColor(serviceData.category)}`}>
                  {serviceData.category}
                </Badge>
              </div>

              <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                {service.content}
              </p>

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {serviceData.area && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {serviceData.area}
                  </div>
                )}
                {(serviceData.availability || serviceData.timeWindow) && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {serviceData.availability || serviceData.timeWindow}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isSelected && (
              <Badge variant="default" className="text-xs">
                Selected for {type === 'offer' ? 'matching' : 'matching'}
              </Badge>
            )}

            <ServiceModerationDialog serviceEvent={service}>
              <Button size="sm" variant="outline" onClick={(e) => e.stopPropagation()}>
                <Shield className="h-4 w-4" />
              </Button>
            </ServiceModerationDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}