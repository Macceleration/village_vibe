import { useSeoMeta } from '@unhead/react';
import { useParams, Link } from 'react-router-dom';
import { useStory, useStoryLabels, extractStoryData } from '@/hooks/useStories';
import { useAuthor } from '@/hooks/useAuthor';
import { useBadges } from '@/hooks/useBadges';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { genUserName } from '@/lib/genUserName';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { NoteContent } from '@/components/NoteContent';
import { CommentsSection } from '@/components/comments/CommentsSection';
import { ZapButton } from '@/components/ZapButton';
import { ShareButton } from '@/components/ShareButton';
import { RelaySelector } from '@/components/RelaySelector';
import { ArrowLeft, Calendar, MapPin, Users, ExternalLink } from 'lucide-react';
import NotFound from './NotFound';

const StoryPage = () => {
  const { storyId } = useParams<{ storyId: string }>();
  const { user } = useCurrentUser();

  useSeoMeta({
    title: 'Story - Village Vibe',
    description: 'Read community stories and connect with your village.',
  });

  // Always call hooks at the top level
  const { data: story, isLoading, error } = useStory(storyId || '');
  const { data: labels } = useStoryLabels(storyId || '');
  const author = useAuthor(story?.pubkey || '');
  const badges = useBadges(story?.pubkey);

  if (!storyId) {
    return <NotFound />;
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Back button */}
          <Skeleton className="h-10 w-24" />

          {/* Cover image */}
          <Skeleton className="aspect-video w-full rounded-lg" />

          {/* Header */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
            <Skeleton className="h-8 w-3/4" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-24" />
            </div>
          </div>

          {/* Content */}
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !story) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card className="border-dashed">
            <CardContent className="py-12 px-8 text-center">
              <div className="max-w-sm mx-auto space-y-6">
                <div className="text-4xl">📖</div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Story not found</h3>
                  <p className="text-muted-foreground">
                    This story doesn't exist or isn't available on this relay
                  </p>
                </div>
                <RelaySelector className="w-full" />
                <Link to="/tribes">
                  <Button variant="outline">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Tribes
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const storyData = extractStoryData(story);
  const metadata = author.data?.metadata;
  const displayName = metadata?.name || metadata?.display_name || genUserName(story.pubkey);

  // Check if story is hidden
  const isHidden = labels?.some(label =>
    label.tags.some(([name, value]) => name === 'l' && value === 'tribe-hidden')
  );

  // Check if story is featured
  const isFeatured = labels?.some(label =>
    label.tags.some(([name, value]) => name === 'l' && value === 'village-featured')
  );

  // Check if story is promoted to village
  const isPromoted = storyData.villages.length > 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Back button */}
        <Button variant="ghost" onClick={() => window.history.back()} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {/* Cover image */}
        {storyData.cover && (
          <div className="aspect-video w-full overflow-hidden rounded-lg">
            <img
              src={storyData.cover}
              alt={storyData.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Story header */}
        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={metadata?.picture} alt={displayName} />
              <AvatarFallback>
                {displayName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    to={`/profile/${story.pubkey}`}
                    className="font-medium hover:underline"
                  >
                    {displayName}
                  </Link>

                  {/* Author badges */}
                  {badges && badges.data && badges.data.length > 0 && (
                    <div className="flex gap-1">
                      {badges.data.slice(0, 3).map((badge, index) => (
                        <div
                          key={badge.definition?.id || index}
                          className="w-5 h-5 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-xs"
                          title={badge.definition?.tags.find(([name]) => name === 'name')?.[1] || 'Badge'}
                        >
                          🏆
                        </div>
                      ))}
                      {badges.data.length > 3 && (
                        <span className="text-sm text-muted-foreground">
                          +{badges.data.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {formatDistanceToNow(new Date(story.created_at * 1000), { addSuffix: true })}
                  </div>

                  {storyData.place && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>{storyData.place}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Title and tags */}
          <div className="space-y-4">
            <h1 className="text-3xl font-bold leading-tight">
              {storyData.title}
            </h1>

            <div className="flex flex-wrap gap-2">
              {storyData.tribe && (
                <Link to={`/tribe/${story.pubkey}:${storyData.tribe}`}>
                  <Badge variant="secondary" className="hover:bg-secondary/80">
                    <Users className="h-3 w-3 mr-1" />
                    {storyData.tribe}
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </Badge>
                </Link>
              )}

              {isPromoted && storyData.villages.map(village => (
                <Badge key={village} variant="outline">
                  🏘️ {village}
                </Badge>
              ))}

              {isFeatured && (
                <Badge variant="default" className="bg-gradient-to-r from-yellow-500 to-orange-500">
                  ⭐ Featured
                </Badge>
              )}

              {isHidden && user && (
                <Badge variant="destructive">
                  🚫 Hidden
                </Badge>
              )}
            </div>

            {storyData.summary && (
              <p className="text-lg text-muted-foreground">
                {storyData.summary}
              </p>
            )}
          </div>
        </div>

        {/* Story content */}
        <Card>
          <CardContent className="prose prose-neutral dark:prose-invert max-w-none p-8">
            <NoteContent event={story} className="text-base leading-relaxed" />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-between py-4 border-t">
          <div className="flex items-center gap-4">
            <ZapButton
              target={story}
              showCount={true}
            />

            <ShareButton
              links={{
                naddr: `naddr1${storyId}`, // This would need proper naddr encoding
                web: window.location.href,
                text: `Check out this story: ${storyData.title} ${window.location.href}`,
              }}
              title={storyData.title || 'Story'}
            />
          </div>

          <div className="text-sm text-muted-foreground">
            Story ID: {storyId}
          </div>
        </div>

        {/* Comments */}
        <CommentsSection
          root={story}
          title="Discussion"
          emptyStateMessage="No comments yet"
          emptyStateSubtitle="Share your thoughts about this story"
        />
      </div>
    </div>
  );
};

export default StoryPage;