import { useState } from "react";
import type { NostrEvent } from "@nostrify/nostrify";
import { useCreateRole } from "@/hooks/useEventCoordination";
import { useNostrPublish } from "@/hooks/useNostrPublish";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/useToast";
import { Loader2 } from "lucide-react";

interface CreateRoleDialogProps {
  event: NostrEvent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateRoleDialog({ event, open, onOpenChange }: CreateRoleDialogProps) {
  const { mutate: createRole, isPending: isCreating } = useCreateRole();
  const { mutateAsync: publish } = useNostrPublish();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    slots: '1',
    timeStart: '',
    timeEnd: '',
    requirements: '',
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

    createRole({
      eventId: event.id,
      eventKind: event.kind,
      eventAuthor: event.pubkey,
      eventDTag,
      title: formData.title.trim(),
      description: formData.description.trim(),
      slots: parseInt(formData.slots) || 1,
      timeStart: formData.timeStart ? new Date(formData.timeStart).getTime() / 1000 : undefined,
      timeEnd: formData.timeEnd ? new Date(formData.timeEnd).getTime() / 1000 : undefined,
      requirements: formData.requirements.trim() || undefined,
    }, {
      onSuccess: async (result) => {
        try {
          await publish(result.eventData);
          toast({
            title: "Success",
            description: "Role created successfully",
          });
          onOpenChange(false);
          setFormData({
            title: '',
            description: '',
            slots: '1',
            timeStart: '',
            timeEnd: '',
            requirements: '',
          });
        } catch (err) {
          console.error('Failed to publish role:', err);
          toast({
            title: "Error",
            description: "Failed to publish role to relay",
            variant: "destructive",
          });
        }
      },
      onError: (err) => {
        console.error('Failed to create role:', err);
        toast({
          title: "Error",
          description: "Failed to create role",
          variant: "destructive",
        });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Event Role</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Role Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Setup Coordinator, Greeter, Cleanup Crew"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe what this role involves..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slots">Number of People Needed *</Label>
            <Input
              id="slots"
              type="number"
              min="1"
              value={formData.slots}
              onChange={(e) => setFormData(prev => ({ ...prev, slots: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="timeStart">Shift Start (Optional)</Label>
              <Input
                id="timeStart"
                type="datetime-local"
                value={formData.timeStart}
                onChange={(e) => setFormData(prev => ({ ...prev, timeStart: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeEnd">Shift End (Optional)</Label>
              <Input
                id="timeEnd"
                type="datetime-local"
                value={formData.timeEnd}
                onChange={(e) => setFormData(prev => ({ ...prev, timeEnd: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="requirements">Requirements (Optional)</Label>
            <Input
              id="requirements"
              value={formData.requirements}
              onChange={(e) => setFormData(prev => ({ ...prev, requirements: e.target.value }))}
              placeholder="e.g., Must have own vehicle, Experience preferred"
            />
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
                'Create Role'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
