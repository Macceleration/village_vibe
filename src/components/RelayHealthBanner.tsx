import { useRelayHealth } from "@/hooks/useRelayHealth";
import { useAppContext } from "@/hooks/useAppContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RelaySelector } from "./RelaySelector";
import { AlertTriangle, RefreshCw, Info } from "lucide-react";
import { Button } from "./ui/button";

export function RelayHealthBanner() {
  const { data: health } = useRelayHealth();
  const { config } = useAppContext();

  // Show info banner if relay is healthy but user should know about multi-relay
  if (health?.status === 'connected' && health.responsive) {
    // Only show this on first load or occasionally - you can remove this if it's too noisy
    return null;
  }

  // Show warning if slow or disconnected
  if (health?.status === 'error' || (health && health.latency > 2000)) {
    const relayName = config.relayUrl.replace('wss://', '').replace('ws://', '').split('/')[0];

    return (
      <Alert variant="destructive" className="mb-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Relay Connection Issues</AlertTitle>
        <AlertDescription className="space-y-3">
          <p className="text-sm">
            {health.status === 'error'
              ? `Primary relay (${relayName}) is unavailable. Querying from backup relays (Ditto + others).`
              : `Primary relay is slow (${health.latency}ms). Also querying from backup relays for better performance.`
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
