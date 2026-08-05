import { useIsFetching } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

export function BackgroundSyncIndicator() {
  const fetching = useIsFetching();

  if (fetching === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50">
      <div className="flex items-center gap-2 rounded-full border bg-background/90 px-3 py-2 text-xs shadow-sm">
        <Loader2 className="h-3 w-3 animate-spin" />
        Syncing {fetching} {fetching === 1 ? 'source' : 'sources'}
      </div>
    </div>
  );
}
