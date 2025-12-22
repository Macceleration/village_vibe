import { useEffect, useState } from 'react';
import { useIsFetching } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

/**
 * Global loading overlay that appears during initial data fetching
 * Shows for a minimum duration to avoid flashing, then disappears when queries complete
 */
export function GlobalLoadingOverlay() {
  const isFetching = useIsFetching();
  const [showLoading, setShowLoading] = useState(true);
  const [minDurationPassed, setMinDurationPassed] = useState(false);

  // Ensure loading shows for at least 500ms to avoid flashing
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinDurationPassed(true);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // Hide loading when fetching is done AND minimum duration has passed
  useEffect(() => {
    if (isFetching === 0 && minDurationPassed) {
      // Add a small delay before hiding to ensure content is rendered
      const timer = setTimeout(() => {
        setShowLoading(false);
      }, 200);
      
      return () => clearTimeout(timer);
    }
  }, [isFetching, minDurationPassed]);

  if (!showLoading) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <div className="text-center space-y-2">
          <p className="text-lg font-medium">Loading Village Vibe</p>
          <p className="text-sm text-muted-foreground">
            Querying multiple Nostr relays...
          </p>
          {isFetching > 0 && (
            <p className="text-xs text-muted-foreground">
              {isFetching} {isFetching === 1 ? 'query' : 'queries'} in progress
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
