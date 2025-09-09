import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useModerateService } from '@/hooks/useServiceModeration';
import { useToast } from '@/hooks/useToast';
import { extractServiceData } from '@/hooks/useServices';
import { Shield, EyeOff, Trash2 } from 'lucide-react';
import type { NostrEvent } from '@nostrify/nostrify';

interface ServiceModerationDialogProps {
  serviceEvent: NostrEvent;
  children: React.ReactNode;
}

export function ServiceModerationDialog({ serviceEvent, children }: ServiceModerationDialogProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const { mutate: moderateService, isPending } = useModerateService();
  const { toast } = useToast();

  const serviceData = extractServiceData(serviceEvent);
  const isOffer = serviceEvent.kind === 38857;

  const handleModerate = (action: 'hide' | 'remove') => {
    moderateService({
      serviceEvent,
      reason: reason.trim() || undefined,
      action,
    }, {
      onSuccess: () => {
        toast({
          title: `Service ${action}d`,
          description: `The ${isOffer ? 'offer' : 'request'} has been ${action}d and will no longer appear in listings.`,
        });
        setOpen(false);
        setReason('');
      },
      onError: () => {
        toast({
          title: 'Error',
          description: `Failed to ${action} service. Please try again.`,
          variant: 'destructive',
        });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Moderate Service
          </DialogTitle>
          <DialogDescription>
            Manage this {isOffer ? 'service offer' : 'service request'} from the community
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Service preview */}
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Badge className="text-xs">
                {isOffer ? 'Offer' : 'Request'} • {serviceData.category}
              </Badge>
            </div>
            <p className="text-sm font-medium mb-1">{serviceEvent.content}</p>
            <p className="text-xs text-muted-foreground">
              by {serviceEvent.pubkey.slice(0, 16)}... • {serviceData.area || 'Location not specified'}
            </p>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason (Optional)</Label>
            <Textarea
              id="reason"
              placeholder="Why is this service being moderated?"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="resize-none"
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="flex-1" disabled={isPending}>
                  <EyeOff className="h-4 w-4 mr-2" />
                  Hide
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Hide Service</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will hide the service from listings but keep it on the network.
                    The author can still see it and other clients may display it.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleModerate('hide')}>
                    Hide Service
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="flex-1" disabled={isPending}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove Service</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will create a strong moderation signal. The service will be hidden
                    from this client and other clients that respect moderation labels.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleModerate('remove')}
                    className="bg-destructive text-destructive-foreground"
                  >
                    Remove Service
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
            className="w-full"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}