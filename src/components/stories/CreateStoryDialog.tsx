import { useState } from 'react';
import { useCreateStory } from '@/hooks/useStories';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useUploadFile } from '@/hooks/useUploadFile';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/useToast';
import { Upload, MapPin, Calendar, Image as ImageIcon, Loader2 } from 'lucide-react';

interface CreateStoryDialogProps {
  children: React.ReactNode;
  tribeId: string;
  tribeName?: string;
  refEventId?: string; // Optional reference to an event
}

export function CreateStoryDialog({ 
  children, 
  tribeId, 
  tribeName,
  refEventId 
}: CreateStoryDialogProps) {
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const { mutate: createStory, isPending: isCreating } = useCreateStory();
  const { mutate: publishEvent } = useNostrPublish();
  const { mutateAsync: uploadFile, isPending: isUploading } = useUploadFile();
  
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    summary: '',
    content: '',
    cover: '',
    place: '',
    lat: '',
    lon: '',
  });

  // Parse tribe data
  const [, dTag] = tribeId.split(':');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Login required",
        description: "Please log in to create a story.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.title.trim() || !formData.content.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide both a title and content for your story.",
        variant: "destructive",
      });
      return;
    }

    try {
      createStory({
        tribe: dTag,
        title: formData.title.trim(),
        summary: formData.summary.trim() || undefined,
        content: formData.content.trim(),
        cover: formData.cover.trim() || undefined,
        place: formData.place.trim() || undefined,
        lat: formData.lat ? parseFloat(formData.lat) : undefined,
        lon: formData.lon ? parseFloat(formData.lon) : undefined,
        refEventId: refEventId,
      }, {
        onSuccess: (result) => {
          publishEvent(result.eventData, {
            onSuccess: () => {
              toast({
                title: "Story created!",
                description: "Your story has been shared with the tribe.",
              });
              setOpen(false);
              setFormData({
                title: '',
                summary: '',
                content: '',
                cover: '',
                place: '',
                lat: '',
                lon: '',
              });
            },
            onError: (error) => {
              console.error('Failed to publish story:', error);
              toast({
                title: "Failed to publish",
                description: "Your story couldn't be published. Please try again.",
                variant: "destructive",
              });
            },
          });
        },
        onError: (error) => {
          console.error('Failed to create story:', error);
          toast({
            title: "Creation failed",
            description: "Failed to create story. Please try again.",
            variant: "destructive",
          });
        },
      });
    } catch (error) {
      console.error('Story creation error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  const handleImageUpload = async (file: File) => {
    try {
      const [[, url]] = await uploadFile(file);
      setFormData(prev => ({ ...prev, cover: url }));
      toast({
        title: "Image uploaded",
        description: "Cover image has been uploaded successfully.",
      });
    } catch (error) {
      console.error('Image upload failed:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          title: "File too large",
          description: "Please select an image smaller than 10MB.",
          variant: "destructive",
        });
        return;
      }
      handleImageUpload(file);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Story</DialogTitle>
          <DialogDescription>
            Share your story with {tribeName || 'the tribe'}. Stories can be promoted to the village by tribe admins.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="What's your story about?"
              maxLength={100}
              required
            />
            <p className="text-xs text-muted-foreground">
              {formData.title.length}/100 characters
            </p>
          </div>

          {/* Summary */}
          <div className="space-y-2">
            <Label htmlFor="summary">Summary</Label>
            <Input
              id="summary"
              value={formData.summary}
              onChange={(e) => setFormData(prev => ({ ...prev, summary: e.target.value }))}
              placeholder="Brief description for preview (optional)"
              maxLength={160}
            />
            <p className="text-xs text-muted-foreground">
              {formData.summary.length}/160 characters
            </p>
          </div>

          {/* Cover Image */}
          <div className="space-y-2">
            <Label>Cover Image</Label>
            <Card className="border-dashed">
              <CardContent className="p-4">
                {formData.cover ? (
                  <div className="space-y-3">
                    <img 
                      src={formData.cover} 
                      alt="Cover preview"
                      className="w-full h-32 object-cover rounded"
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setFormData(prev => ({ ...prev, cover: '' }))}
                      >
                        Remove
                      </Button>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                        id="cover-upload"
                        disabled={isUploading}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('cover-upload')?.click()}
                        disabled={isUploading}
                      >
                        {isUploading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Change
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center space-y-3">
                    <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground" />
                    <div>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                        id="cover-upload"
                        disabled={isUploading}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('cover-upload')?.click()}
                        disabled={isUploading}
                      >
                        {isUploading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Upload Cover Image
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Optional cover image for your story
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content">Story Content *</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              placeholder="Tell your story... (Markdown supported)"
              rows={8}
              required
            />
            <p className="text-xs text-muted-foreground">
              Markdown formatting is supported
            </p>
          </div>

          <Separator />

          {/* Optional Location */}
          <div className="space-y-4">
            <Label className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Location (Optional)
            </Label>
            
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="place" className="text-sm">Place Name</Label>
                <Input
                  id="place"
                  value={formData.place}
                  onChange={(e) => setFormData(prev => ({ ...prev, place: e.target.value }))}
                  placeholder="e.g., Community Center, Main Street"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="lat" className="text-sm">Latitude</Label>
                  <Input
                    id="lat"
                    type="number"
                    step="any"
                    value={formData.lat}
                    onChange={(e) => setFormData(prev => ({ ...prev, lat: e.target.value }))}
                    placeholder="40.7128"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lon" className="text-sm">Longitude</Label>
                  <Input
                    id="lon"
                    type="number"
                    step="any"
                    value={formData.lon}
                    onChange={(e) => setFormData(prev => ({ ...prev, lon: e.target.value }))}
                    placeholder="-74.0060"
                  />
                </div>
              </div>
            </div>
          </div>

          {refEventId && (
            <div className="bg-muted/50 p-3 rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4" />
                <span>This story references an event</span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isCreating || !formData.title.trim() || !formData.content.trim()}
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Story'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}