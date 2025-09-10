import { Link } from 'react-router-dom';
import { useAuthor } from '@/hooks/useAuthor';
import { useBadges } from '@/hooks/useBadges';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { extractStoryData } from '@/hooks/useStories';
import { genUserName } from '@/lib/genUserName';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ZapButton } from '@/components/ZapButton';
import { ShareButton } from '@/components/ShareButton';
import { StoryModerationDialog } from './StoryModerationDialog';
import { TribeName } from '@/components/tribes/TribeName';
import { HideTribeButton } from '@/components/villages/HideTribeButton';
import { BookOpen, MapPin, Calendar, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import type { NostrEvent } from '@nostrify/nostrify';

interface StoryCardProps {
  story: NostrEvent;
  showVillageTag?: boolean;
  showTribeTag?: boolean;
  showModerationActions?: boolean;
  showHideTribeOption?: boolean;
  villageSlug?: string;
  className?: string;
}

export function StoryCard({
  story,
  showVillageTag = false,
  showTribeTag = true,
  showModerationActions = false,
  showHideTribeOption = false,
  villageSlug,
  className = ''
}: StoryCardProps) {
  const { user } = useCurrentUser();
  const author = useAuthor(story.pubkey);
  const badges = useBadges(story.pubkey);

  const storyData = extractStoryData(story);
  const metadata = author.data?.metadata;
  const displayName = metadata?.name || metadata?.display_name || genUserName(story.pubkey);

  // Get story coordinates for linking
  const storyId = `${story.pubkey}:${storyData.dTag}`;

  // Truncate summary for preview
  const previewText = storyData.summary ||
    (story.content.length > 160 ?
      story.content.substring(0, 160) + '...' :
      story.content);

  return (
    <Card className={`group hover:shadow-md transition-shadow ${className}`}>
      {storyData.cover && (
        <div className="aspect-video w-full overflow-hidden rounded-t-lg">
          <img
            src={storyData.cover}
            alt={storyData.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      )}

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Avatar className="h-10 w-10">
              <AvatarImage src={metadata?.picture} alt={displayName} />
              <AvatarFallback>
                {displayName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  to={`/profile/${story.pubkey}`}
                  className="font-medium text-sm hover:underline truncate"
                >
                  {displayName}
                </Link>

                {/* Author badges */}
                {badges && badges.data && badges.data.length > 0 && (
                  <div className="flex gap-1">
                    {badges.data.slice(0, 2).map((badge, index) => (
                      <div
                        key={badge.definition?.id || index}
                        className="w-4 h-4 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-xs"
                        title={badge.definition?.tags.find(([name]) => name === 'name')?.[1] || 'Badge'}
                      >
                        🏆
                      </div>
                    ))}
                    {badges.data.length > 2 && (
                      <span className="text-xs text-muted-foreground">
                        +{badges.data.length - 2}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {formatDistanceToNow(new Date(story.created_at * 1000), { addSuffix: true })}

                {storyData.place && (
                  <>
                    <span>•</span>
                    <MapPin className="h-3 w-3" />
                    <span className="truncate">{storyData.place}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Title and tags */}
        <div className="space-y-2">
          <Link
            to={`/story/${storyId}`}
            className="block"
          >
            <h3 className="font-semibold text-lg leading-tight hover:text-primary transition-colors line-clamp-2">
              {storyData.title}
            </h3>
          </Link>

          <div className="flex flex-wrap gap-2">
            {showTribeTag && storyData.tribe && (
              <TribeName tribeTag={storyData.tribe} />
            )}

            {showVillageTag && storyData.villages.length > 0 && (
              <Badge variant="outline" className="text-xs">
                🏘️ {storyData.villages[0]}
              </Badge>
            )}
          </div>
        </div>

        {/* Preview text */}
        <p className="text-sm text-muted-foreground line-clamp-3">
          {previewText}
        </p>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <Link to={`/story/${storyId}`}>
            <Button variant="ghost" size="sm" className="text-xs">
              <BookOpen className="h-4 w-4 mr-1" />
              Read Story
            </Button>
          </Link>

          <div className="flex items-center gap-1">
            <ZapButton
              target={story}
              className="text-xs"
            />

            <ShareButton
              links={{
                naddr: `naddr1${storyId}`, // This would need proper naddr encoding
                web: `${window.location.origin}/story/${storyId}`,
                text: `Check out this story: ${storyData.title} ${window.location.origin}/story/${storyId}`,
              }}
              title={storyData.title || 'Story'}
            />

            {(showModerationActions || showHideTribeOption) && user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {showModerationActions && (
                    <StoryModerationDialog story={story} villageSlug={villageSlug}>
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        Moderate Story
                      </DropdownMenuItem>
                    </StoryModerationDialog>
                  )}
                  {showHideTribeOption && storyData.tribe && (
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <HideTribeButton
                        tribeTag={storyData.tribe}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start p-0 h-auto"
                      />
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}