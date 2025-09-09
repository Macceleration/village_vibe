import { useSeoMeta } from '@unhead/react';
import { usePublicTribes } from "@/hooks/useTribes";
import { TribeCard } from "@/components/tribes/TribeCard";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RelaySelector } from "@/components/RelaySelector";
import { Users } from "lucide-react";

const TribesPage = () => {
  const { data: publicTribes, isLoading: publicTribesLoading } = usePublicTribes();

  useSeoMeta({
    title: 'Browse Tribes - Village Vibe',
    description: 'Browse and discover public tribes and communities on Nostr.',
  });

  if (publicTribesLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <div className="h-8 w-48 bg-muted rounded animate-pulse mx-auto" />
            <div className="h-4 w-64 bg-muted rounded animate-pulse mx-auto" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const hasPublicTribes = publicTribes && publicTribes.length > 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            🔍 Browse Tribes
          </h1>
          <p className="text-xl text-muted-foreground flex items-center justify-center gap-2">
            <Users className="h-5 w-5" />
            Discover {publicTribes?.length || 0} public communities
          </p>
        </div>

        {hasPublicTribes ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {publicTribes.map((tribe) => (
              <TribeCard key={tribe.id} tribe={tribe} />
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-12 px-8 text-center">
              <div className="max-w-sm mx-auto space-y-6">
                <div className="text-4xl">🔍</div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">No public tribes found</h3>
                  <p className="text-muted-foreground">
                    Try switching to a different relay to discover more communities
                  </p>
                </div>
                <RelaySelector className="w-full" />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default TribesPage;