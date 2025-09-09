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
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAdminSuggestMatch } from '@/hooks/useServiceMatching';
import { useAuthor } from '@/hooks/useAuthor';
import { useToast } from '@/hooks/useToast';
import { extractServiceData } from '@/hooks/useServices';
import { genUserName } from '@/lib/genUserName';
import { Link, MapPin, Clock, DollarSign } from 'lucide-react';
import type { NostrEvent } from '@nostrify/nostrify';

const matchSchema = z.object({
  suggestion: z.string().min(1, 'Please provide a suggestion for why these services match'),
  notifyParties: z.boolean().default(true),
});

type MatchFormData = z.infer<typeof matchSchema>;

interface AdminMatchDialogProps {
  offerEvent: NostrEvent;
  requestEvent: NostrEvent;
  children: React.ReactNode;
}

export function AdminMatchDialog({ offerEvent, requestEvent, children }: AdminMatchDialogProps) {
  const [open, setOpen] = useState(false);
  const { mutate: suggestMatch, isPending } = useAdminSuggestMatch();
  const { toast } = useToast();

  const offerAuthor = useAuthor(offerEvent.pubkey);
  const requestAuthor = useAuthor(requestEvent.pubkey);

  const offerData = extractServiceData(offerEvent);
  const requestData = extractServiceData(requestEvent);

  const offerDisplayName = offerAuthor.data?.metadata?.name ?? genUserName(offerEvent.pubkey);
  const requestDisplayName = requestAuthor.data?.metadata?.name ?? genUserName(requestEvent.pubkey);

  const form = useForm<MatchFormData>({
    resolver: zodResolver(matchSchema),
    defaultValues: {
      suggestion: '',
      notifyParties: true,
    },
  });

  const onSubmit = async (data: MatchFormData) => {
    suggestMatch({
      offerEvent,
      requestEvent,
      suggestion: data.suggestion,
      notifyParties: data.notifyParties,
    }, {
      onSuccess: () => {
        toast({
          title: 'Match suggested!',
          description: data.notifyParties
            ? 'Both parties have been notified of the potential match.'
            : 'Match has been recorded for future reference.',
        });
        setOpen(false);
        form.reset();
      },
      onError: () => {
        toast({
          title: 'Error',
          description: 'Failed to suggest match. Please try again.',
          variant: 'destructive',
        });
      },
    });
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'yardwork': return '🌱';
      case 'pets': return '🐕';
      case 'eldercare': return '👵';
      case 'errands': return '🏃';
      case 'oddjobs': return '🔧';
      default: return '❓';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Suggest Service Match
          </DialogTitle>
          <DialogDescription>
            Connect a service offer with a request to help community members find each other
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Service preview cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Offer card */}
            <Card className="border-green-200 dark:border-green-800">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    {getCategoryIcon(offerData.category)} Offer
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={offerAuthor.data?.metadata?.picture} alt={offerDisplayName} />
                    <AvatarFallback className="text-xs">
                      {offerDisplayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{offerDisplayName}</p>
                    <p className="text-xs text-muted-foreground">Helper</p>
                  </div>
                </div>

                <p className="text-sm mb-3">{offerEvent.content}</p>

                <div className="space-y-1 text-xs text-muted-foreground">
                  {offerData.area && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {offerData.area}
                    </div>
                  )}
                  {offerData.availability && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {offerData.availability}
                    </div>
                  )}
                  {offerData.rate && (
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      {offerData.rate}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Request card */}
            <Card className="border-blue-200 dark:border-blue-800">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    {getCategoryIcon(requestData.category)} Request
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={requestAuthor.data?.metadata?.picture} alt={requestDisplayName} />
                    <AvatarFallback className="text-xs">
                      {requestDisplayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{requestDisplayName}</p>
                    <p className="text-xs text-muted-foreground">Needs help</p>
                  </div>
                </div>

                <p className="text-sm mb-3">{requestEvent.content}</p>

                <div className="space-y-1 text-xs text-muted-foreground">
                  {requestData.area && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {requestData.area}
                    </div>
                  )}
                  {requestData.timeWindow && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {requestData.timeWindow}
                    </div>
                  )}
                  {requestData.rate && (
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      {requestData.rate}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Match suggestion */}
              <FormField
                control={form.control}
                name="suggestion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Why do these services match?</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., Both are in the same area and the timing works well..."
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      This message will be shared with both parties if notifications are enabled
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Notify parties */}
              <FormField
                control={form.control}
                name="notifyParties"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Notify both parties</FormLabel>
                      <FormDescription>
                        Send DMs to both users about this potential match
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
                  {isPending ? 'Suggesting...' : 'Suggest Match'}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}