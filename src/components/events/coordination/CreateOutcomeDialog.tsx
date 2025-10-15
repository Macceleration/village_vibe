import { useState } from "react";
import type { NostrEvent } from "@nostrify/nostrify";
import { useCreateOutcome, type OutcomeType } from "@/hooks/useEventCoordination";
import { useNostrPublish } from "@/hooks/useNostrPublish";
import { useUploadFile } from "@/hooks/useUploadFile";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/useToast";
import { Loader2, Upload } from "lucide-react";

interface CreateOutcomeDialogProps {
  event: NostrEvent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const OUTCOME_TYPES: { value: OutcomeType; label: string }[] = [
  { value: 'metric', label: 'Metric (numbers/stats)' },
  { value: 'story', label: 'Story (narrative)' },
  { value: 'photo', label: 'Photo (visual)' },
  { value: 'feedback', label: 'Feedback (testimonial)' },
];

export function CreateOutcomeDialog({ event, open, onOpenChange }: CreateOutcomeDialogProps) {
  const { mutate: createOutcome, isPending: isCreating } = useCreateOutcome();
  const { mutateAsync: publish } = useNostrPublish();
  const { mutateAsync: uploadFile, isPending: isUploading } = useUploadFile();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    type: 'metric' as OutcomeType,
    title: '',
    content: '',
    value: '',
    unit: '',
    mediaUrl: '',
  });

  const eventDTag = event.tags.find(([n]) => n === 'd')?.[1];

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const [[, url]] = await uploadFile(file);
      setFormData(prev => ({ ...prev, mediaUrl: url }));
      toast({
        title: "Success",
        description: "Image uploaded successfully",
      });
    } catch (err) {
      console.error('Failed to upload image:', err);
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.content.trim()) {
      toast({
        title: "Error",
        description: "Title and content are required",
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

    console.log('🎯 Creating outcome for event:', {
      eventId: event.id,
      eventKind: event.kind,
      eventDTag,
      type: formData.type,
      title: formData.title.trim(),
    });

    createOutcome({
      eventId: event.id,
      eventKind: event.kind,
      eventAuthor: event.pubkey,
      eventDTag,
      type: formData.type,
      title: formData.title.trim(),
      content: formData.content.trim(),
      value: formData.value ? parseFloat(formData.value) : undefined,
      unit: formData.unit.trim() || undefined,
      mediaUrl: formData.mediaUrl || undefined,
    }, {
      onSuccess: async (result) => {
        console.log('✅ Outcome data created:', {
          outcomeId: result.outcomeId,
          kind: result.eventData.kind,
          tags: result.eventData.tags,
        });

        try {
          console.log('📤 Publishing outcome to Nostr...');
          const published = await publish(result.eventData);
          console.log('✅ Outcome published successfully:', {
            id: published.id,
            outcomeId: result.outcomeId,
          });
          toast({
            title: "Success",
            description: "Outcome recorded successfully",
          });
          onOpenChange(false);
          setFormData({
            type: 'metric',
            title: '',
            content: '',
            value: '',
            unit: '',
            mediaUrl: '',
          });
        } catch (err) {
          console.error('Failed to publish outcome:', err);
          toast({
            title: "Error",
            description: "Failed to publish outcome to relay",
            variant: "destructive",
          });
        }
      },
      onError: (err) => {
        console.error('Failed to create outcome:', err);
        toast({
          title: "Error",
          description: "Failed to create outcome",
          variant: "destructive",
        });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Record Event Outcome</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="type">Outcome Type *</Label>
            <Select
              value={formData.type}
              onValueChange={(value: OutcomeType) => setFormData(prev => ({ ...prev, type: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OUTCOME_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Total Attendance, Community Impact, Volunteer Hours"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Description *</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              placeholder="Describe the outcome or tell the story..."
              rows={4}
            />
          </div>

          {formData.type === 'metric' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="value">Value</Label>
                <Input
                  id="value"
                  type="number"
                  step="0.01"
                  value={formData.value}
                  onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                  placeholder="e.g., 50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                <Input
                  id="unit"
                  value={formData.unit}
                  onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                  placeholder="e.g., people, lbs, hours"
                />
              </div>
            </div>
          )}

          {(formData.type === 'photo' || formData.type === 'story') && (
            <div className="space-y-2">
              <Label htmlFor="image">Image (Optional)</Label>
              <div className="flex gap-2">
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isUploading}
                />
                {isUploading && <Loader2 className="h-4 w-4 animate-spin" />}
              </div>
              {formData.mediaUrl && (
                <div className="mt-2">
                  <img
                    src={formData.mediaUrl}
                    alt="Preview"
                    className="rounded-lg max-h-32 object-cover"
                  />
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating || isUploading}>
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Recording...
                </>
              ) : (
                'Record Outcome'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
