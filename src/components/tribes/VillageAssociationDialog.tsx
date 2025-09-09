import { useState, useEffect } from 'react';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useCurrentUser } from '@/hooks/useCurrentUser';
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
import { useToast } from '@/hooks/useToast';
import { Plus, X, MapPin, Loader2 } from 'lucide-react';
import type { NostrEvent } from '@nostrify/nostrify';

interface VillageAssociationDialogProps {
  children: React.ReactNode;
  tribe: NostrEvent;
}

export function VillageAssociationDialog({ children, tribe }: VillageAssociationDialogProps) {
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const { mutate: publishEvent, isPending } = useNostrPublish();
  
  const [open, setOpen] = useState(false);
  const [newVillage, setNewVillage] = useState('');
  const [villages, setVillages] = useState<string[]>([]);

  // Extract current villages from tribe tags
  useEffect(() => {
    if (tribe) {
      const currentVillages = tribe.tags
        .filter(([name]) => name === 'village')
        .map(([, value]) => value)
        .filter(Boolean);
      setVillages(currentVillages);
    }
  }, [tribe]);

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

  const handleSave = async () => {
    if (!user) {
      toast({
        title: "Login required",
        description: "Please log in to manage village associations.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create updated tribe event with new village tags
      const dTag = tribe.tags.find(([name]) => name === 'd')?.[1];
      if (!dTag) {
        throw new Error('Tribe missing d tag');
      }

      // Build new tags array, replacing village tags
      const newTags = tribe.tags
        .filter(([name]) => name !== 'village') // Remove existing village tags
        .concat(villages.map(village => ['village', village])); // Add new village tags

      const updatedTribe = {
        kind: 34550,
        content: tribe.content,
        tags: newTags,
        created_at: Math.floor(Date.now() / 1000),
      };

      publishEvent(updatedTribe, {
        onSuccess: () => {
          toast({
            title: "Villages updated",
            description: `Tribe is now associated with ${villages.length} village(s).`,
          });
          setOpen(false);
        },
        onError: (error) => {
          console.error('Failed to update tribe villages:', error);
          toast({
            title: "Update failed",
            description: "Failed to update village associations. Please try again.",
            variant: "destructive",
          });
        },
      });
    } catch (error) {
      console.error('Village association error:', error);
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
            <MapPin className="h-5 w-5" />
            Village Associations
          </DialogTitle>
          <DialogDescription>
            Associate this tribe with villages to make content discoverable in village feeds.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current villages */}
          <div className="space-y-3">
            <Label>Associated Villages</Label>
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
                    No villages associated yet
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
            <p className="text-xs text-muted-foreground">
              Village names will be converted to lowercase slugs (e.g., "East Side" → "east-side")
            </p>
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
              onClick={handleSave}
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}