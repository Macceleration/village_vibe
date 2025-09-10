import { useState } from 'react';
import { useSeoMeta } from '@unhead/react';
import { useParams } from 'react-router-dom';
import { useNostr } from '@nostrify/react';
import { useVillageStories, useMultiVillageStories } from '@/hooks/useStories';
import { useVillageServices } from '@/hooks/useServices';
import { useVillageEvents } from '@/hooks/useEvents';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useVillagePreferences } from '@/hooks/useVillagePreferences';
import { StoryCard } from '@/components/stories/StoryCard';
import { ServiceCard } from '@/components/services/ServiceCard';
import { EventCard } from '@/components/events/EventCard';
import { VillageFeedPreferencesDialog } from '@/components/villages/VillageFeedPreferencesDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { RelaySelector } from '@/components/RelaySelector';
import { LoginArea } from '@/components/auth/LoginArea';
import {
  Search,
  Calendar,
  BookOpen,
  HandHeart,
  Filter,
  Sparkles,
  Settings
} from 'lucide-react';
import type { NostrEvent } from '@nostrify/nostrify';
import type { VillagePreferences } from '@/hooks/useVillagePreferences';

const VillagePage = () => {
  const { villageSlug } = useParams<{ villageSlug: string }>();
  const { user } = useCurrentUser();
  const { preferences } = useVillagePreferences();

  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  // Default to a general village if no slug provided
  const currentVillage = villageSlug || 'main';

  useSeoMeta({
    title: `${currentVillage === 'main' ? 'Village' : `${currentVillage} Village`} - Village Vibe`,
    description: `Discover stories, events, and services in ${currentVillage === 'main' ? 'your' : currentVillage} village community.`,
  });

  // Determine which villages to query based on preferences and URL
  const villagesToQuery = (() => {
    // If we're on a specific village page, show only that village
    if (villageSlug && villageSlug !== 'main') {
      return [villageSlug];
    }

    // If we're on the main village page, use preferences
    if (preferences.showAllVillages) {
      return []; // Empty array means show all villages
    } else {
      return preferences.selectedVillages.length > 0 ? preferences.selectedVillages : ['mack-eastside']; // Fallback
    }
  })();

  // Always call both hooks, but use the appropriate one based on query type
  const allVillageStories = useVillageStories('main', {
    search: search.trim() || undefined,
    limit: 20,
  });

  const specificVillageStories = useMultiVillageStories(villagesToQuery, {
    search: search.trim() || undefined,
    limit: 20,
  });

  // Choose which result to use
  const { data: stories, isLoading: storiesLoading } = villagesToQuery.length === 0
    ? allVillageStories
    : specificVillageStories;

  const { data: services, isLoading: servicesLoading } = useVillageServices(currentVillage, {
    search: search.trim() || undefined,
  });

  const { data: events, isLoading: eventsLoading } = useVillageEvents(currentVillage, {
    search: search.trim() || undefined,
  });

  const isLoading = storiesLoading || servicesLoading || eventsLoading;

  // Filter content by time
  const filterByTime = <T extends NostrEvent>(items: T[]): T[] => {
    if (timeFilter === 'all') return items;

    const now = Date.now() / 1000;
    const timeThresholds = {
      today: now - (24 * 60 * 60),
      week: now - (7 * 24 * 60 * 60),
      month: now - (30 * 24 * 60 * 60),
    };

    const threshold = timeThresholds[timeFilter];
    return items.filter(item => item.created_at >= threshold);
  };

  // Combine and sort all content
  const allContent = [
    ...(stories || []).map(item => ({ ...item, type: 'story' as const })),
    ...(services || []).map(item => ({ ...item, type: 'service' as const })),
    ...(events || []).map(item => ({ ...item, type: 'event' as const })),
  ].sort((a, b) => b.created_at - a.created_at);

  const filteredContent = filterByTime(allContent);

  // Get featured stories (stories with village tags are considered "featured")
  const featuredStories = (stories || [])
    .filter(story => story.tags.some(([name]) => name === 'village'))
    .slice(0, 6);

  const renderContent = (content: (NostrEvent & { type: 'story' | 'service' | 'event' })[]) => {
    if (content.length === 0) {
      return (
        <Card className="border-dashed">
          <CardContent className="py-12 px-8 text-center">
            <div className="max-w-sm mx-auto space-y-6">
              <div className="text-4xl">🏘️</div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">
                  {search ? 'No content found' : 'No content yet'}
                </h3>
                <p className="text-muted-foreground">
                  {search
                    ? `No content matches "${search}" in this village.`
                    : 'This village hasn\'t shared any content yet. Be the first to contribute!'
                  }
                </p>
              </div>

              {!search && (
                <div className="space-y-4">
                  {!user ? (
                    <>
                      <p className="text-sm text-muted-foreground">
                        Log in to start sharing with your village
                      </p>
                      <LoginArea className="max-w-60 mx-auto" />
                    </>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Try switching to a different relay to see more content
                      </p>
                      <RelaySelector className="w-full" />
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {content.map((item) => {
          switch (item.type) {
            case 'story':
              return (
                <StoryCard
                  key={`story-${item.id}`}
                  story={item}
                  showVillageTag={false}
                  showTribeTag={true}
                  showHideTribeOption={true}
                />
              );
            case 'service':
              return (
                <ServiceCard
                  key={`service-${item.id}`}
                  event={item}
                />
              );
            case 'event':
              return (
                <EventCard
                  key={`event-${item.id}`}
                  event={item}
                />
              );
            default:
              return null;
          }
        })}
      </div>
    );
  };

  const filteredStories = filterByTime(stories || []);
  const filteredServices = filterByTime(services || []);
  const filteredEvents = filterByTime(events || []);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Village header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-4">
            <h1 className="text-4xl font-bold tracking-tight">
              🏘️ {currentVillage === 'main' ? 'Village' : `${currentVillage} Village`}
            </h1>
            {currentVillage === 'main' && (
              <VillageFeedPreferencesDialog>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Feed Preferences
                </Button>
              </VillageFeedPreferencesDialog>
            )}
          </div>
          <p className="text-xl text-muted-foreground">
            {currentVillage === 'main'
              ? 'Discover stories, events, and services across all villages'
              : 'Discover stories, events, and services in your community'
            }
          </p>
        </div>

        {/* Featured stories hero section */}
        {featuredStories.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              <h2 className="text-2xl font-semibold">Featured Stories</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredStories.map((story) => (
                <StoryCard
                  key={`featured-${story.id}`}
                  story={story}
                  showVillageTag={true}
                  showTribeTag={true}
                  showHideTribeOption={true}
                  className="border-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20"
                />
              ))}
            </div>
          </div>
        )}

        {/* Filters and search */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search village content..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <div className="flex gap-1">
                {(['all', 'today', 'week', 'month'] as const).map((filter) => (
                  <Button
                    key={filter}
                    variant={timeFilter === filter ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTimeFilter(filter)}
                  >
                    {filter === 'all' ? 'All time' :
                     filter === 'today' ? 'Today' :
                     filter === 'week' ? 'This week' : 'This month'}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Content tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex justify-between items-center">
            <TabsList>
              <TabsTrigger value="all" className="flex items-center gap-2">
                All
                <Badge variant="secondary" className="ml-1">
                  {filteredContent.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="stories" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Stories
                <Badge variant="secondary" className="ml-1">
                  {filteredStories.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="events" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Events
                <Badge variant="secondary" className="ml-1">
                  {filteredEvents.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="services" className="flex items-center gap-2">
                <HandHeart className="h-4 w-4" />
                Services
                <Badge variant="secondary" className="ml-1">
                  {filteredServices.length}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="all">
            {isLoading ? (
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
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              renderContent(filteredContent)
            )}
          </TabsContent>

          <TabsContent value="stories">
            {storiesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i}>
                    <Skeleton className="aspect-video w-full" />
                    <CardContent className="p-6 space-y-4">
                      <Skeleton className="h-6 w-3/4" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              renderContent(filteredStories.map(story => ({ ...story, type: 'story' as const })))
            )}
          </TabsContent>

          <TabsContent value="events">
            {eventsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-6 space-y-4">
                      <Skeleton className="h-6 w-3/4" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              renderContent(filteredEvents.map(event => ({ ...event, type: 'event' as const })))
            )}
          </TabsContent>

          <TabsContent value="services">
            {servicesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-6 space-y-4">
                      <Skeleton className="h-6 w-3/4" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              renderContent(filteredServices.map(service => ({ ...service, type: 'service' as const })))
            )}
          </TabsContent>
        </Tabs>

        {/* Quick stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8 border-t">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Stories Shared
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredStories.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Events Hosted
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredEvents.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <HandHeart className="h-4 w-4" />
                Services Available
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredServices.length}</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Debug Tool */}
      <VillageDebugTool
        currentVillage={currentVillage}
        villagesToQuery={villagesToQuery}
        preferences={preferences}
        usingAllVillages={villagesToQuery.length === 0}
      />
    </div>
  );
}

interface DebugEvent {
  id: string;
  author?: string;
  title: string;
  tags?: string[];
  allTags?: string[];
  villageTags?: string[];
  tTags?: string[];
  matchingReason?: string;
}

interface DebugQueryResult {
  count: number;
  events: DebugEvent[];
}

interface DebugData {
  timestamp: string;
  queries: Record<string, DebugQueryResult>;
  clientSideFiltering: {
    totalStories: number;
    totalServices: number;
    totalEvents: number;
    storiesWithVillageTags: number;
    servicesWithVillageTags: number;
    eventsWithVillageTags: number;
    villageTaggedStories: DebugEvent[];
    debugStories?: {
      id: string;
      title: string;
      author: string;
      allTags: string[];
      hasVillageTag: boolean;
      villageTags: string[];
    }[];
    authorCounts?: Record<string, number>;
  };
  hookSimulation: {
    count: number;
    testVillage: string;
    events: DebugEvent[];
  };
  error?: string;
}

function VillageDebugTool({
  currentVillage,
  villagesToQuery,
  preferences,
  usingAllVillages
}: {
  currentVillage: string;
  villagesToQuery: string[];
  preferences: VillagePreferences;
  usingAllVillages: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const { nostr } = useNostr();
  const [debugData, setDebugData] = useState<DebugData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const runDiagnostics = async () => {
    setIsLoading(true);
    try {
      const signal = AbortSignal.timeout(5000);

      // Test different query strategies
      const results: DebugData = {
        timestamp: new Date().toISOString(),
        queries: {},
        clientSideFiltering: {
          totalStories: 0,
          totalServices: 0,
          totalEvents: 0,
          storiesWithVillageTags: 0,
          servicesWithVillageTags: 0,
          eventsWithVillageTags: 0,
          villageTaggedStories: []
        },
        hookSimulation: {
          count: 0,
          testVillage: '',
          events: []
        }
      };

      // 1. Query all content types (no filtering)
      console.log('🔍 Testing queries: All stories, services, events');
      const [allStories, allServices, allEvents] = await Promise.all([
        nostr.query([{ kinds: [30023], limit: 100 }], { signal }),
        nostr.query([{ kinds: [38857, 30627], limit: 100 }], { signal }),
        nostr.query([{ kinds: [31923], limit: 100 }], { signal })
      ]);

      // Check if we're getting the same author as the tribe debug
      const authorCounts = allStories.reduce((acc, story) => {
        const author = story.pubkey.slice(0, 8);
        acc[author] = (acc[author] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      console.log('📊 Authors in results:', authorCounts);

      // 1b. Query specifically for the author from tribe debug
      const tribeAuthor = 'a847369f9ed651c1fba996f0e93d432b511edaece56cd88d9b94a8b5f7c7c5f5';
      console.log('🔍 Testing query: Stories by tribe author');
      const authorStories = await nostr.query([{
        kinds: [30023],
        authors: [tribeAuthor],
        limit: 20
      }], { signal });
      results.queries.authorStories = {
        count: authorStories.length,
        events: authorStories.slice(0, 3).map(e => ({
          id: e.id.slice(0, 8),
          author: e.pubkey.slice(0, 8),
          title: e.tags.find(([name]) => name === 'title')?.[1] || 'No title',
          tags: e.tags.filter(([name]) => name === 'village').map(([, value]) => value),
          allTags: e.tags.map(([name, value]) => `${name}:${value}`).slice(0, 10)
        }))
      };
      results.queries.allStories = {
        count: allStories.length,
        events: allStories.slice(0, 3).map(e => ({
          id: e.id.slice(0, 8),
          author: e.pubkey.slice(0, 8),
          title: e.tags.find(([name]) => name === 'title')?.[1] || 'No title',
          tags: e.tags.filter(([name]) => name === 't').map(([, value]) => value),
          allTags: e.tags.map(([name, value]) => `${name}:${value}`).slice(0, 10)
        }))
      };

      results.queries.allServices = {
        count: allServices.length,
        events: allServices.slice(0, 3).map(e => ({
          id: e.id.slice(0, 8),
          author: e.pubkey.slice(0, 8),
          title: e.kind === 38857 ? 'Service Offer' : 'Service Request',
          tags: e.tags.filter(([name]) => name === 'village').map(([, value]) => value),
          allTags: e.tags.map(([name, value]) => `${name}:${value}`).slice(0, 10)
        }))
      };

      results.queries.allEvents = {
        count: allEvents.length,
        events: allEvents.slice(0, 3).map(e => ({
          id: e.id.slice(0, 8),
          author: e.pubkey.slice(0, 8),
          title: e.tags.find(([name]) => name === 'title')?.[1] || 'No title',
          tags: e.tags.filter(([name]) => name === 'village').map(([, value]) => value),
          allTags: e.tags.map(([name, value]) => `${name}:${value}`).slice(0, 10)
        }))
      };

      // 2. Query with #village filter for current village
      const testVillage = villagesToQuery.length > 0 ? villagesToQuery[0] : 'mack-eastside';
      console.log('🔍 Testing query: #village filter for', testVillage);

      const [villageStories, villageServices, villageEvents] = await Promise.all([
        nostr.query([{ kinds: [30023], '#village': [testVillage], limit: 100 }], { signal }),
        nostr.query([{ kinds: [38857, 30627], '#village': [testVillage], limit: 100 }], { signal }),
        nostr.query([{ kinds: [31923], '#village': [testVillage], limit: 100 }], { signal })
      ]);

      results.queries.villageStories = {
        count: villageStories.length,
        events: villageStories.slice(0, 3).map(e => ({
          id: e.id.slice(0, 8),
          author: e.pubkey.slice(0, 8),
          title: e.tags.find(([name]) => name === 'title')?.[1] || 'No title',
          tags: e.tags.filter(([name]) => name === 'village').map(([, value]) => value),
          allTags: e.tags.map(([name, value]) => `${name}:${value}`).slice(0, 10)
        }))
      };

      results.queries.villageServices = {
        count: villageServices.length,
        events: villageServices.slice(0, 3).map(e => ({
          id: e.id.slice(0, 8),
          author: e.pubkey.slice(0, 8),
          title: e.kind === 38857 ? 'Service Offer' : 'Service Request',
          tags: e.tags.filter(([name]) => name === 'village').map(([, value]) => value),
          allTags: e.tags.map(([name, value]) => `${name}:${value}`).slice(0, 10)
        }))
      };

      results.queries.villageEvents = {
        count: villageEvents.length,
        events: villageEvents.slice(0, 3).map(e => ({
          id: e.id.slice(0, 8),
          author: e.pubkey.slice(0, 8),
          title: e.tags.find(([name]) => name === 'title')?.[1] || 'No title',
          tags: e.tags.filter(([name]) => name === 'village').map(([, value]) => value),
          allTags: e.tags.map(([name, value]) => `${name}:${value}`).slice(0, 10)
        }))
      };

      // 3. Query for promotion labels (kind 1985) - the fix mentioned this approach
      console.log('🔍 Testing query: Promotion labels (kind 1985)');
      const promotionLabels = await nostr.query([{
        kinds: [1985],
        '#l': ['village-promoted'],
        limit: 50
      }], { signal });
      results.queries.promotionLabels = {
        count: promotionLabels.length,
        events: promotionLabels.slice(0, 3).map(e => ({
          id: e.id.slice(0, 8),
          title: 'Promotion Label',
          tags: e.tags.filter(([name]) => ['a', 'l', 'L'].includes(name)).map(([name, value]) => `${name}:${value}`)
        }))
      };

      // 4. Query with specific village names
      const villageNames = ['mack-eastside', 'ferndale', 'bellingham', 'seattle'];
      for (const village of villageNames) {
        console.log(`🔍 Testing query: #t ${village} filter`);
        const villageStories = await nostr.query([{
          kinds: [30023],
          '#t': [village],
          limit: 50
        }], { signal });
        results.queries[`village_${village}`] = {
          count: villageStories.length,
          events: villageStories.slice(0, 2).map(e => ({
            id: e.id.slice(0, 8),
            title: e.tags.find(([name]) => name === 'title')?.[1] || 'No title',
            tags: e.tags.filter(([name]) => name === 't').map(([, value]) => value)
          }))
        };
      }

      // 4. Client-side filtering analysis
      const storiesWithVillageTags = allStories.filter(story =>
        story.tags.some(([name]) => name === 'village')
      );

      const servicesWithVillageTags = allServices.filter(service =>
        service.tags.some(([name]) => name === 'village')
      );

      const eventsWithVillageTags = allEvents.filter(event =>
        event.tags.some(([name]) => name === 'village')
      );

      // Debug: Show ALL tag types in first few stories
      const debugStories = allStories.slice(0, 5).map(e => ({
        id: e.id.slice(0, 8),
        title: e.tags.find(([name]) => name === 'title')?.[1] || 'No title',
        author: e.pubkey.slice(0, 8),
        allTags: e.tags.map(([name, value]) => `${name}=${value || ''}`),
        hasVillageTag: e.tags.some(([name]) => name === 'village'),
        villageTags: e.tags.filter(([name]) => name === 'village').map(([, value]) => value)
      }));

      results.clientSideFiltering = {
        totalStories: allStories.length,
        totalServices: allServices.length,
        totalEvents: allEvents.length,
        storiesWithVillageTags: storiesWithVillageTags.length,
        servicesWithVillageTags: servicesWithVillageTags.length,
        eventsWithVillageTags: eventsWithVillageTags.length,
        villageTaggedStories: storiesWithVillageTags.map(e => ({
          id: e.id.slice(0, 8),
          title: e.tags.find(([name]) => name === 'title')?.[1] || 'No title',
          villageTags: e.tags.filter(([name]) => name === 'village').map(([, value]) => value),
          allTTags: e.tags.filter(([name]) => name === 't').map(([, value]) => value)
        })),
        debugStories, // Add this for detailed inspection
        authorCounts: authorCounts as Record<string, number>
      };

      // 5. Test current useVillageStories hook behavior (simplified logic)
      console.log('🔍 Testing simplified hook behavior simulation');
      const simulationVillage = 'main'; // Test with main village (shows all)
      const hookSimulation = allStories.filter(event => {
        // For main village page, show all village content
        if (simulationVillage === 'main') {
          // Check for explicit village tags (any village)
          const villageTags = event.tags.filter(([name]) => name === 'village');
          return villageTags.length > 0;
        } else {
          // For specific village pages, filter by that village
          const villageTags = event.tags.filter(([name]) => name === 'village');
          return villageTags.some(([, value]) => value === simulationVillage);
        }
      });

      results.hookSimulation = {
        count: hookSimulation.length,
        testVillage: simulationVillage,
        events: hookSimulation.map(e => ({
          id: e.id.slice(0, 8),
          title: e.tags.find(([name]) => name === 'title')?.[1] || 'No title',
          villageTags: e.tags.filter(([name]) => name === 'village').map(([, value]) => value),
          tTags: e.tags.filter(([name]) => name === 't').map(([, value]) => value),
          matchingReason: (() => {
            const hasVillage = e.tags.some(([name]) => name === 'village');
            return hasVillage ? 'village-tag' : 'none';
          })()
        }))
      };

      setDebugData(results);
    } catch (error) {
      console.error('Debug diagnostics failed:', error);
      setDebugData({
        timestamp: new Date().toISOString(),
        queries: {},
        clientSideFiltering: {
          totalStories: 0,
          totalServices: 0,
          totalEvents: 0,
          storiesWithVillageTags: 0,
          servicesWithVillageTags: 0,
          eventsWithVillageTags: 0,
          villageTaggedStories: []
        },
        hookSimulation: { count: 0, testVillage: '', events: [] },
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    setIsLoading(false);
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(true)}
          className="bg-background/80 backdrop-blur-sm border-muted-foreground/20"
        >
          🔧 Debug
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 max-h-96 bg-background border rounded-lg shadow-lg overflow-hidden">
      <div className="p-3 border-b flex items-center justify-between">
        <h3 className="font-medium text-sm">Village Feed Debug</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(false)}
          className="h-6 w-6 p-0"
        >
          ×
        </Button>
      </div>

      <div className="p-3 space-y-3 overflow-y-auto max-h-80">
        <Button
          onClick={runDiagnostics}
          disabled={isLoading}
          size="sm"
          className="w-full"
        >
          {isLoading ? 'Running...' : 'Run Diagnostics'}
        </Button>

        {debugData && (
          <div className="space-y-2 text-xs">
            {debugData.error ? (
              <div className="text-red-600 font-mono">
                Error: {debugData.error}
              </div>
            ) : (
              <>
                <div className="font-medium">Query Strategy:</div>
                <div className="text-xs text-muted-foreground mb-2 space-y-1">
                  <div>Current village: {currentVillage}</div>
                  <div>Show all villages: {preferences.showAllVillages ? 'Yes' : 'No'}</div>
                  <div>Selected villages: {preferences.selectedVillages.join(', ') || 'None'}</div>
                  <div>Querying: {usingAllVillages ? 'All villages' : villagesToQuery.join(', ')}</div>
                </div>

                <div className="font-medium">Query Results:</div>

                <div className="space-y-1">
                  <div className="font-mono">
                    All Stories: {debugData.queries?.allStories?.count || 0}
                  </div>
                  <div className="font-mono">
                    All Services: {debugData.queries?.allServices?.count || 0}
                  </div>
                  <div className="font-mono">
                    All Events: {debugData.queries?.allEvents?.count || 0}
                  </div>
                  <div className="font-mono">
                    Stories by tribe author: {debugData.queries?.authorStories?.count || 0}
                  </div>
                  <div className="font-mono">
                    Village Stories: {debugData.queries?.villageStories?.count || 0}
                  </div>
                  <div className="font-mono">
                    Village Services: {debugData.queries?.villageServices?.count || 0}
                  </div>
                  <div className="font-mono">
                    Village Events: {debugData.queries?.villageEvents?.count || 0}
                  </div>
                  <div className="font-mono">
                    Promotion labels: {debugData.queries?.promotionLabels?.count || 0}
                  </div>
                </div>

                <div className="border-t pt-2">
                  <div className="font-medium">Client-side Analysis:</div>
                  <div className="font-mono">
                    Stories with village tags: {debugData.clientSideFiltering?.storiesWithVillageTags || 0}
                  </div>
                  <div className="font-mono">
                    Services with village tags: {debugData.clientSideFiltering?.servicesWithVillageTags || 0}
                  </div>
                  <div className="font-mono">
                    Events with village tags: {debugData.clientSideFiltering?.eventsWithVillageTags || 0}
                  </div>
                  <div className="font-mono">
                    Hidden tribes: {preferences.hiddenTribes.length > 0 ? preferences.hiddenTribes.join(', ') : 'None'}
                  </div>
                  <div className="font-mono">
                    Hook simulation: {debugData.hookSimulation?.count || 0}
                  </div>
                  {debugData.clientSideFiltering?.authorCounts && (
                    <div className="text-xs mt-1">
                      <div className="font-medium">Authors in results:</div>
                      {Object.entries(debugData.clientSideFiltering.authorCounts).map(([author, count]) => (
                        <div key={author} className="font-mono">
                          {author}: {count} stories
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {debugData.clientSideFiltering?.debugStories && (
                  <div className="border-t pt-2">
                    <div className="font-medium">Sample Stories (first 5):</div>
                    {debugData.clientSideFiltering.debugStories.map((story, i: number) => (
                      <div key={i} className="text-xs font-mono border rounded p-1 mt-1">
                        <div>ID: {story.id}</div>
                        <div>Title: {story.title}</div>
                        <div>Author: {story.author}</div>
                        <div>Has Village Tag: {story.hasVillageTag ? 'Yes' : 'No'}</div>
                        <div>Village Tags: {story.villageTags?.join(', ') || 'None'}</div>
                        <div className="text-xs text-muted-foreground">
                          All Tags: {story.allTags?.slice(0, 8).join(', ')}
                          {story.allTags?.length > 8 && '...'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {debugData.clientSideFiltering?.villageTaggedStories?.length > 0 && (
                  <div className="border-t pt-2">
                    <div className="font-medium">Found Village Stories:</div>
                    {debugData.clientSideFiltering.villageTaggedStories.map((story, i: number) => (
                      <div key={i} className="text-xs font-mono border rounded p-1 mt-1">
                        <div>ID: {story.id}</div>
                        <div>Title: {story.title}</div>
                        <div>Villages: {story.villageTags?.join(', ') || 'None'}</div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="text-xs text-muted-foreground">
                  Last run: {new Date(debugData.timestamp).toLocaleTimeString()}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VillagePage;