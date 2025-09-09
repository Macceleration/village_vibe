import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useCreateService, SERVICE_CATEGORIES, type ServiceType, type ServiceCategory } from '@/hooks/useServices';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useToast } from '@/hooks/useToast';
import { Plus, X } from 'lucide-react';

const serviceSchema = z.object({
  type: z.enum(['offer', 'request']),
  category: z.enum(SERVICE_CATEGORIES),
  content: z.string().min(1, 'Description is required').max(140, 'Description must be 140 characters or less'),
  area: z.string().optional(),
  availability: z.string().optional(),
  timeWindow: z.string().optional(),
  rate: z.string().optional(),
  radius: z.string().optional(),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  villages: z.array(z.string()).optional(),
  expires: z.boolean().optional(),
  expiresDate: z.string().optional(),
});

type ServiceFormData = z.infer<typeof serviceSchema>;

interface CreateServiceDialogProps {
  tribeId: string;
  children: React.ReactNode;
  defaultType?: ServiceType;
}

export function CreateServiceDialog({ tribeId, children, defaultType = 'offer' }: CreateServiceDialogProps) {
  const { user } = useCurrentUser();
  const { mutate: createService, isPending: isCreating } = useCreateService();
  const { mutate: publishEvent, isPending: isPublishing } = useNostrPublish();
  const { toast } = useToast();
  const isPending = isCreating || isPublishing;
  const [open, setOpen] = useState(false);
  const [selectedVillages, setSelectedVillages] = useState<string[]>([]);
  const [newVillage, setNewVillage] = useState('');

  const form = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      type: defaultType,
      category: 'yardwork',
      content: '',
      lat: 42.3314, // Default to Detroit area
      lon: -83.0458,
      villages: [],
      expires: false,
    },
  });

  const serviceType = form.watch('type');
  const hasExpiration = form.watch('expires');

  const onSubmit = async (data: ServiceFormData) => {
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please log in to create a service listing.',
        variant: 'destructive',
      });
      return;
    }

    const [, dTag] = tribeId.split(':');

    const serviceData = {
      type: data.type,
      tribe: dTag,
      category: data.category,
      content: data.content,
      lat: data.lat,
      lon: data.lon,
      area: data.area,
      avail: data.availability,
      time: data.timeWindow,
      rate: data.rate,
      radius: data.radius,
      villages: selectedVillages.length > 0 ? selectedVillages : undefined,
      expires: hasExpiration && data.expiresDate ?
        Math.floor(new Date(data.expiresDate).getTime() / 1000) : undefined,
    };

    createService(serviceData, {
      onSuccess: (result) => {
        // Publish the event to Nostr
        publishEvent(result.eventData, {
          onSuccess: () => {
            toast({
              title: 'Service created',
              description: `Your ${data.type} has been posted to the community.`,
            });

            setOpen(false);
            form.reset();
            setSelectedVillages([]);
          },
          onError: (error) => {
            console.error('Service publishing error:', error);
            toast({
              title: 'Publishing Error',
              description: 'Failed to publish service to Nostr. Please try again.',
              variant: 'destructive',
            });
          },
        });
      },
      onError: (error) => {
        console.error('Service creation error:', error);
        toast({
          title: 'Error',
          description: 'Failed to create service. Please try again.',
          variant: 'destructive',
        });
      },
    });
  };

  const addVillage = () => {
    if (newVillage.trim() && !selectedVillages.includes(newVillage.trim())) {
      setSelectedVillages([...selectedVillages, newVillage.trim()]);
      setNewVillage('');
    }
  };

  const removeVillage = (village: string) => {
    setSelectedVillages(selectedVillages.filter(v => v !== village));
  };

  const getCategoryIcon = (category: ServiceCategory) => {
    switch (category) {
      case 'yardwork': return '🌱';
      case 'pets': return '🐕';
      case 'eldercare': return '👵';
      case 'errands': return '🏃';
      case 'oddjobs': return '🔧';
      default: return '❓';
    }
  };

  if (!user) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Service {serviceType === 'offer' ? 'Offer' : 'Request'}</DialogTitle>
          <DialogDescription>
            {serviceType === 'offer'
              ? 'Offer to help your community with a service'
              : 'Request help from your community'
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Type Toggle */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={field.value === 'offer' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => field.onChange('offer')}
                      className="flex-1"
                    >
                      I can help (Offer)
                    </Button>
                    <Button
                      type="button"
                      variant={field.value === 'request' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => field.onChange('request')}
                      className="flex-1"
                    >
                      I need help (Request)
                    </Button>
                  </div>
                </FormItem>
              )}
            />

            {/* Category */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SERVICE_CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {getCategoryIcon(category)} {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={serviceType === 'offer'
                        ? 'Describe what you can help with...'
                        : 'Describe what help you need...'
                      }
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {field.value.length}/140 characters
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Location */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="lat"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Latitude</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.0001"
                        placeholder="42.3314"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Longitude</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.0001"
                        placeholder="-83.0458"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Area */}
            <FormField
              control={form.control}
              name="area"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Area (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Van Dyke & Mack" {...field} />
                  </FormControl>
                  <FormDescription>
                    Human-readable area description
                  </FormDescription>
                </FormItem>
              )}
            />

            {/* Availability/Time */}
            {serviceType === 'offer' ? (
              <FormField
                control={form.control}
                name="availability"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Availability (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., weekends, evenings" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            ) : (
              <FormField
                control={form.control}
                name="timeWindow"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Time (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Tue 10-12" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}

            {/* Rate */}
            <FormField
              control={form.control}
              name="rate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rate (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., $20/hr, zap-what-you-want" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Radius (for offers) */}
            {serviceType === 'offer' && (
              <FormField
                control={form.control}
                name="radius"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Radius (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 0.5mi, 2 blocks" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}

            {/* Villages */}
            <div className="space-y-2">
              <FormLabel>Villages (Optional)</FormLabel>
              <div className="flex gap-2">
                <Input
                  placeholder="Add village..."
                  value={newVillage}
                  onChange={(e) => setNewVillage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addVillage();
                    }
                  }}
                />
                <Button type="button" size="sm" onClick={addVillage}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {selectedVillages.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedVillages.map((village) => (
                    <Badge key={village} variant="secondary" className="flex items-center gap-1">
                      {village}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => removeVillage(village)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Expiration */}
            <FormField
              control={form.control}
              name="expires"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Auto-expire</FormLabel>
                    <FormDescription>
                      Automatically hide this listing after a date
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {hasExpiration && (
              <FormField
                control={form.control}
                name="expiresDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiration Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} className="flex-1">
                {isPending ? 'Creating...' : `Create ${serviceType}`}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}