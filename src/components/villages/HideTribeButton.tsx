import { useVillagePreferences } from '@/hooks/useVillagePreferences';
import { useTribeName } from '@/hooks/useTribes';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/useToast';
import { EyeOff } from 'lucide-react';

interface HideTribeButtonProps {
  tribeTag?: string;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
}

export function HideTribeButton({
  tribeTag,
  className = '',
  variant = 'ghost',
  size = 'sm'
}: HideTribeButtonProps) {
  const { toast } = useToast();
  const { hideTribe, isTribeHidden } = useVillagePreferences();
  const { data: tribeData } = useTribeName(tribeTag);

  if (!tribeTag) {
    return null;
  }

  const displayName = tribeData?.name || tribeTag;
  const isHidden = isTribeHidden(tribeTag);

  const handleHide = () => {
    hideTribe(tribeTag);
    toast({
      title: "Tribe hidden",
      description: `Content from "${displayName}" will no longer appear in your village feed. You can unhide it in Feed Preferences.`,
    });
  };

  if (isHidden) {
    return (
      <Button
        variant="outline"
        size={size}
        disabled
        className={`${className} opacity-50`}
        title={`${displayName} is already hidden`}
      >
        <EyeOff className="h-4 w-4 mr-1" />
        Already Hidden
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleHide}
      className={className}
      title={`Hide content from ${displayName}`}
    >
      <EyeOff className="h-4 w-4 mr-1" />
      Hide Tribe
    </Button>
  );
}