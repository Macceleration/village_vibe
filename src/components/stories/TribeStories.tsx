import { useState } from 'react';
import { useTribeStories } from '@/hooks/useStories';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { StoryCard } from './StoryCard';
import { CreateStoryDialog } from './CreateStoryDialog';
import { StoryDebug } from './StoryDebug';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { RelaySelector } from '@/components/RelaySelector';
import { LoginArea } from '@/components/auth/LoginArea';
import { Plus, Search, BookOpen } from 'lucide-react';
import type { NostrEvent } from '@nostrify/nostrify';

interface TribeStoriesProps {
  tribeId: string;
  tribe: NostrEvent;
  canCreateStories?: boolean;
  isModerator?: boolean;
  villageSlug?: string;
}

export function TribeStories({
  tribeId,
  tribe,
  canCreateStories = false,
  isModerator = false,
  villageSlug
}: TribeStoriesProps) {
  const { user } = useCurrentUser();
  const [search, setSearch] = useState('');

  const { data: stories, isLoading, error } = useTribeStories(tribeId, {
    search: search.trim() || undefined,
  });

  // Get tribe name for display
  const tribeName = tribe.tags.find(([name]) => name === 'name')?.[1] ||
                   tribe.tags.find(([name]) => name === 'd')?.[1] ||
                   'Unknown Tribe';

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <Skeleton className="h-10 w-full sm:max-w-sm" />
          <Skeleton className="h-10 w-32" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <div className="aspect-video w-full">
                <Skeleton className="h-full w-full" />
              </div>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-1 flex-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <Skeleton className="h-6 w-3/4" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
                <div className="flex justify-between">
                  <Skeleton className="h-8 w-20" />
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 px-8 text-center">
          <div className="max-w-sm mx-auto space-y-6">
            <div className="text-4xl">⚠️</div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Failed to load stories</h3>
              <p className="text-muted-foreground">
                There was an error loading stories. Try switching relays.
              </p>
            </div>
            <RelaySelector className="w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Debug component */}
      <StoryDebug tribeId={tribeId} />

      {/* Header with search and create button */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search stories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {user && canCreateStories && (
          <CreateStoryDialog tribeId={tribeId} tribeName={tribeName}>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Story
            </Button>
          </CreateStoryDialog>
        )}
      </div>

      {/* Stories grid or empty state */}
      {stories && stories.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stories.map((story) => (
            <StoryCard
              key={story.id}
              story={story}
              showTribeTag={false} // Don't show tribe tag on tribe page
              showVillageTag={true} // Show village tag if promoted
              showModerationActions={isModerator}
              villageSlug={villageSlug}
            />
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-12 px-8 text-center">
            <div className="max-w-sm mx-auto space-y-6">
              <div className="text-4xl">
                <BookOpen className="h-16 w-16 mx-auto text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">
                  {search ? 'No stories found' : 'No stories yet'}
                </h3>
                <p className="text-muted-foreground">
                  {search
                    ? `No stories match "${search}". Try a different search term.`
                    : canCreateStories
                      ? 'Be the first to share a story with this tribe!'
                      : 'This tribe hasn\'t shared any stories yet.'
                  }
                </p>
              </div>

              {!user ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Log in to create stories
                  </p>
                  <LoginArea className="max-w-60 mx-auto" />
                </div>
              ) : canCreateStories ? (
                <CreateStoryDialog tribeId={tribeId} tribeName={tribeName}>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Story
                  </Button>
                </CreateStoryDialog>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Try switching to a different relay to see more content
                  </p>
                  <RelaySelector className="w-full" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}