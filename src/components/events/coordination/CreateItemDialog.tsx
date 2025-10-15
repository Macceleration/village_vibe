import { useState } from "react";
import type { NostrEvent } from "@nostrify/nostrify";
import { useCreateItem } from "@/hooks/useEventCoordination";
import { useNostrPublish } from "@/hooks/useNostrPublish";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/useToast";
import { Loader2 } from "lucide-react";

interface CreateItemDialogProps {
  event: NostrEvent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ITEM_CATEGORIES = [
  { value: 'food', label: 'Food' },
  { value: 'drinks', label: 'Drinks' },
  { value: 'tools', label: 'Tools' },
  { value: 'supplies', label: 'Supplies' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'materials', label: 'Materials' },
  { value: 'other', label: 'Other' },
];

export function CreateItemDialog({ event, open, onOpenChange }: CreateItemDialogProps) {
  const { mutate: createItem, isPending: isCreating } = useCreateItem();
  const { mutateAsync: publish } = useNostrPublish();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    quantity: '1',
    category: '',
    unit: '',
  });

  const eventDTag = event.tags.find(([n]) => n === 'd')?.[1];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.description.trim()) {
      toast({
        title: "Error",
        description: "Title and description are required",
        variant: "destructive",
      });
      return;
    }

    if (!eventDTag) {
      toast({
        title: "Error",
        description: "Event is missing d-tag",
        variant: "destructive",
      });
      return;
    }

    createItem({
      eventId: event.id,
      eventKind: event.kind,
      eventAuthor: event.pubkey,
      eventDTag,
      title: formData.title.trim(),
      description: formData.description.trim(),
      quantity: parseInt(formData.quantity) || 1,
      category: formData.category || undefined,
      unit: formData.unit.trim() || undefined,
    }, {
      onSuccess: async (result) => {
        try {
          await publish(result.eventData);
          toast({
            title: "Success",
            description: "Item created successfully",
          });
          onOpenChange(false);
          setFormData({
            title: '',
            description: '',
            quantity: '1',
            category: '',
            unit: '',
          });
        } catch (err) {
          console.error('Failed to publish item:', err);
          toast({
            title: "Error",
            description: "Failed to publish item to relay",
            variant: "destructive",
          });
        }
      },
      onError: (err) => {
        console.error('Failed to create item:', err);
        toast({
          title: "Error",
          description: "Failed to create item",
          variant: "destructive",
        });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Item Needed</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Item Name *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Paper plates, Folding chairs, First aid kit"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe the item or any specific requirements..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit">Unit (Optional)</Label>
              <Input
                id="unit"
                value={formData.unit}
                onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                placeholder="e.g., servings, pieces, sets"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category (Optional)</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {ITEM_CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Item'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
