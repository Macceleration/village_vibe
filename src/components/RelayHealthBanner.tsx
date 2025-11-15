import { useRelayHealth } from "@/hooks/useRelayHealth";
import { useAppContext } from "@/hooks/useAppContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RelaySelector } from "./RelaySelector";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "./ui/button";

export function RelayHealthBanner() {
  const { data: health } = useRelayHealth();
  const { config } = useAppContext();

  // Don't show if relay is healthy
  if (health?.status === 'connected' && health.responsive) {
    return null;
  }

  // Show warning if slow or disconnected
  if (health?.status === 'error' || (health && health.latency > 2000)) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Relay Connection Issues</AlertTitle>
        <AlertDescription className="space-y-3">
          <p className="text-sm">
            {health.status === 'error' 
              ? `Cannot connect to ${config.relayUrl}. Events may not load properly.`
              : `Relay is slow (${health.latency}ms). You may experience delays.`
            }
          </p>
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="h-3 w-3 mr-2" />
              Reload
            </Button>
            <div className="flex-1">
              <RelaySelector className="w-full max-w-xs" />
            </div>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
