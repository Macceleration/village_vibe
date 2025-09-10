import { useState } from 'react';
import { useVillagePreferences } from '@/hooks/useVillagePreferences';
import { useTribeName } from '@/hooks/useTribes';
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
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/useToast';
import { Plus, X, Settings, MapPin } from 'lucide-react';

interface VillageFeedPreferencesDialogProps {
  children: React.ReactNode;
}

export function VillageFeedPreferencesDialog({ children }: VillageFeedPreferencesDialogProps) {
  const { toast } = useToast();
  const { preferences, addVillage, removeVillage, toggleShowAll, clearAll, showTribe } = useVillagePreferences();

  const [open, setOpen] = useState(false);
  const [newVillage, setNewVillage] = useState('');

  const handleAddVillage = () => {
    const villageSlug = newVillage.trim();
    if (villageSlug) {
      addVillage(villageSlug);
      setNewVillage('');
      toast({
        title: "Village added",
        description: `Added "${villageSlug}" to your feed preferences.`,
      });
    }
  };

  const handleRemoveVillage = (village: string) => {
    removeVillage(village);
    toast({
      title: "Village removed",
      description: `Removed "${village}" from your feed preferences.`,
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddVillage();
    }
  };

  const handleClearAll = () => {
    clearAll();
    toast({
      title: "Preferences reset",
      description: "Now showing content from all villages.",
    });
  };

  const handleShowTribe = (tribeTag: string) => {
    showTribe(tribeTag);
    toast({
      title: "Tribe unhidden",
      description: "Content from this tribe will now appear in your feed.",
    });
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
            Village Feed Preferences
          </DialogTitle>
          <DialogDescription>
            Customize which villages appear in your feed. Leave empty to see all villages.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Show all villages toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="show-all">Show All Villages</Label>
              <p className="text-xs text-muted-foreground">
                Display content from all villages in your feed
              </p>
            </div>
            <Switch
              id="show-all"
              checked={preferences.showAllVillages}
              onCheckedChange={toggleShowAll}
            />
          </div>

          <Separator />

          {/* Selected villages */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Selected Villages</Label>
              {preferences.selectedVillages.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  className="text-xs h-7"
                >
                  Clear All
                </Button>
              )}
            </div>

            {preferences.selectedVillages.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {preferences.selectedVillages.map((village) => (
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
                      onClick={() => handleRemoveVillage(village)}
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
                    {preferences.showAllVillages
                      ? "Showing all villages"
                      : "No specific villages selected"
                    }
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Add new village */}
          {!preferences.showAllVillages && (
            <div className="space-y-3">
              <Label htmlFor="new-village">Add Village to Feed</Label>
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
                  onClick={handleAddVillage}
                  disabled={!newVillage.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Add villages you want to see in your feed
              </p>
            </div>
          )}

          {/* Common villages suggestions */}
          {!preferences.showAllVillages && (
            <div className="space-y-2">
              <Label className="text-sm">Quick Add</Label>
              <div className="flex flex-wrap gap-1">
                {['downtown', 'eastside', 'westside', 'northside', 'southside', 'midtown'].map((suggestion) => (
                  <Button
                    key={suggestion}
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => {
                      if (!preferences.selectedVillages.includes(suggestion)) {
                        addVillage(suggestion);
                      }
                    }}
                    disabled={preferences.selectedVillages.includes(suggestion)}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Hidden tribes */}
          {preferences.hiddenTribes.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <Label>Hidden Tribes</Label>
                <p className="text-xs text-muted-foreground">
                  Content from these tribes won't appear in your village feed
                </p>
                <div className="flex flex-wrap gap-2">
                  {preferences.hiddenTribes.map((tribeTag) => (
                    <HiddenTribeItem
                      key={tribeTag}
                      tribeTag={tribeTag}
                      onShow={() => handleShowTribe(tribeTag)}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Current status */}
          <div className="bg-muted/50 p-3 rounded-lg text-sm">
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="h-4 w-4" />
              <span className="font-medium">Current Setting:</span>
            </div>
            <p className="text-muted-foreground">
              {preferences.showAllVillages
                ? "Showing content from all villages"
                : preferences.selectedVillages.length === 0
                  ? "No villages selected - feed will be empty"
                  : `Showing content from ${preferences.selectedVillages.length} selected village(s)`
              }
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end pt-4">
            <Button onClick={() => setOpen(false)}>
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Component to display a hidden tribe with option to unhide
function HiddenTribeItem({ tribeTag, onShow }: { tribeTag: string; onShow: () => void }) {
  const { data: tribeData } = useTribeName(tribeTag);
  const displayName = tribeData?.name || tribeTag;

  return (
    <Badge
      variant="secondary"
      className="flex items-center gap-1 pr-1 opacity-60"
    >
      🚫 {displayName}
      <Button
        variant="ghost"
        size="sm"
        className="h-4 w-4 p-0 hover:bg-green-500 hover:text-white"
        onClick={onShow}
        title="Show content from this tribe"
      >
        <Plus className="h-3 w-3" />
      </Button>
    </Badge>
  );
}