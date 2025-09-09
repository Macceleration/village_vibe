import { useState } from 'react';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { extractServiceData } from '@/hooks/useServices';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/useToast';
import { Plus, X, Settings, Eye, Loader2 } from 'lucide-react';
import type { NostrEvent } from '@nostrify/nostrify';

interface ServicePromotionDialogProps {
  children: React.ReactNode;
  service: NostrEvent;
}

export function ServicePromotionDialog({ children, service }: ServicePromotionDialogProps) {
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const { mutate: publishEvent, isPending } = useNostrPublish();
  
  const [open, setOpen] = useState(false);
  const [newVillage, setNewVillage] = useState('');
  const [villages, setVillages] = useState<string[]>([]);

  const serviceData = extractServiceData(service);
  const serviceType = service.kind === 38857 ? 'offer' : 'request';

  // Extract current villages from service tags
  const currentVillages = service.tags
    .filter(([name]) => name === 'village')
    .map(([, value]) => value)
    .filter(Boolean);

  // Initialize villages state with current villages
  useState(() => {
    setVillages(currentVillages);
  });

  const addVillage = () => {
    const villageSlug = newVillage.trim().toLowerCase().replace(/\s+/g, '-');
    if (villageSlug && !villages.includes(villageSlug)) {
      setVillages([...villages, villageSlug]);
      setNewVillage('');
    }
  };

  const removeVillage = (villageToRemove: string) => {
    setVillages(villages.filter(v => v !== villageToRemove));
  };

  const handlePromoteToVillages = async () => {
    if (!user) {
      toast({
        title: "Login required",
        description: "Please log in to promote services.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create updated service with village tags
      const dTag = service.tags.find(([name]) => name === 'd')?.[1];
      if (!dTag) {
        throw new Error('Service missing d tag');
      }

      // Build new tags array, replacing village tags
      const newTags = service.tags
        .filter(([name]) => name !== 'village') // Remove existing village tags
        .concat(villages.map(village => ['village', village])); // Add new village tags

      const updatedService = {
        kind: service.kind,
        content: service.content,
        tags: newTags,
        created_at: Math.floor(Date.now() / 1000),
      };

      publishEvent(updatedService, {
        onSuccess: () => {
          toast({
            title: "Service promoted",
            description: `Service is now visible in ${villages.length} village(s).`,
          });
          setOpen(false);
        },
        onError: (error) => {
          console.error('Failed to promote service:', error);
          toast({
            title: "Promotion failed",
            description: "Failed to promote service to villages. Please try again.",
            variant: "destructive",
          });
        },
      });
    } catch (error) {
      console.error('Service promotion error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addVillage();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Promote Service to Villages
          </DialogTitle>
          <DialogDescription>
            Make this service visible in village feeds by adding village associations.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Service info */}
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant={serviceType === 'offer' ? 'default' : 'secondary'}>
                  {serviceType === 'offer' ? '🤝 Offer' : '🙋 Request'}
                </Badge>
                <Badge variant="outline">{serviceData.category}</Badge>
              </div>
              <h4 className="font-medium text-sm truncate">{service.content}</h4>
              <p className="text-xs text-muted-foreground mt-1">
                by {service.pubkey.slice(0, 8)}...
              </p>
            </CardContent>
          </Card>

          {/* Current villages */}
          <div className="space-y-3">
            <Label>Villages</Label>
            {villages.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {villages.map((village) => (
                  <Badge
                    key={village}
                    variant="secondary"
                    className="flex items-center gap-1 pr-1"
                  >
                    🏘️ {village}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => removeVillage(village)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            ) : (
              <Card className="border-dashed">
                <CardContent className="py-6 px-4 text-center">
                  <div className="text-muted-foreground text-sm">
                    No villages selected
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Add new village */}
          <div className="space-y-3">
            <Label htmlFor="new-village">Add Village</Label>
            <div className="flex gap-2">
              <Input
                id="new-village"
                value={newVillage}
                onChange={(e) => setNewVillage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="e.g., downtown, eastside, ferndale"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addVillage}
                disabled={!newVillage.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Common villages suggestions */}
          <div className="space-y-2">
            <Label className="text-sm">Common Villages</Label>
            <div className="flex flex-wrap gap-1">
              {['downtown', 'eastside', 'westside', 'northside', 'southside', 'midtown'].map((suggestion) => (
                <Button
                  key={suggestion}
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => {
                    if (!villages.includes(suggestion)) {
                      setVillages([...villages, suggestion]);
                    }
                  }}
                  disabled={villages.includes(suggestion)}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePromoteToVillages}
              disabled={isPending || villages.length === 0}
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Promoting...
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Promote to Villages
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}