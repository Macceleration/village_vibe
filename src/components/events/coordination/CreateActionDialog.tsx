import { useState } from "react";
import type { NostrEvent } from "@nostrify/nostrify";
import { useCreateAction } from "@/hooks/useEventCoordination";
import { useNostrPublish } from "@/hooks/useNostrPublish";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/useToast";
import { Loader2 } from "lucide-react";

interface CreateActionDialogProps {
  event: NostrEvent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export function CreateActionDialog({ event, open, onOpenChange }: CreateActionDialogProps) {
  const { mutate: createAction, isPending: isCreating } = useCreateAction();
  const { mutateAsync: publish } = useNostrPublish();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    dueDate: '',
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

    console.log('🎯 Creating action for event:', {
      eventId: event.id,
      eventKind: event.kind,
      eventDTag,
      title: formData.title.trim(),
    });

    createAction({
      eventId: event.id,
      eventKind: event.kind,
      eventAuthor: event.pubkey,
      eventDTag,
      title: formData.title.trim(),
      description: formData.description.trim(),
      priority: formData.priority as 'low' | 'medium' | 'high' | 'urgent',
      dueDate: formData.dueDate ? new Date(formData.dueDate).getTime() / 1000 : undefined,
    }, {
      onSuccess: async (result) => {
        console.log('✅ Action data created:', {
          actionId: result.actionId,
          kind: result.eventData.kind,
          tags: result.eventData.tags,
        });

        try {
          console.log('📤 Publishing action to Nostr...');
          const published = await publish(result.eventData);
          console.log('✅ Action published successfully:', {
            id: published.id,
            actionId: result.actionId,
          });
          toast({
            title: "Success",
            description: "Task created successfully",
          });
          onOpenChange(false);
          setFormData({
            title: '',
            description: '',
            priority: 'medium',
            dueDate: '',
          });
        } catch (err) {
          console.error('Failed to publish action:', err);
          toast({
            title: "Error",
            description: "Failed to publish task to relay",
            variant: "destructive",
          });
        }
      },
      onError: (err) => {
        console.error('Failed to create action:', err);
        toast({
          title: "Error",
          description: "Failed to create task",
          variant: "destructive",
        });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Task</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Task Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Reserve venue, Buy supplies, Send invites"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe what needs to be done..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(p => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date (Optional)</Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
              />
            </div>
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
                'Create Task'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
