import { useSeoMeta } from '@unhead/react';
import { Link } from 'react-router-dom';
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { LoginArea } from "@/components/auth/LoginArea";
import { RelaySelector } from "@/components/RelaySelector";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Calendar, Package, ListChecks, Trophy, HandHeart, BookOpen, MessageCircle, Zap } from 'lucide-react';

export function AboutPage() {
  const { user } = useCurrentUser();

  useSeoMeta({
    title: 'About - Village Vibe',
    description: 'Learn about Village Vibe - a Nostr-native platform for building vibrant local communities',
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-5xl mx-auto space-y-12">
        
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            🏘️ Village Vibe
          </h1>
          <p className="text-2xl text-muted-foreground">
            Build vibrant local communities on Nostr
          </p>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            A decentralized platform for creating tribes, coordinating events, sharing stories, 
            and connecting with your local village community.
          </p>
          
          {!user && (
            <div className="flex flex-col items-center gap-4 pt-6">
              <LoginArea className="max-w-60" />
              <p className="text-sm text-muted-foreground">or</p>
              <Button asChild size="lg">
                <Link to="/tribes">Browse Public Tribes</Link>
              </Button>
            </div>
          )}
        </div>

        {/* What is Village Vibe */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">What is Village Vibe?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground">
            <p>
              Village Vibe is a Nostr-native community platform that empowers groups to self-organize, 
              share knowledge, and coordinate real-world activities. Built on the open Nostr protocol, 
              it enables communities to own their data, control their governance, and connect across relays.
            </p>
            <p>
              Whether you're organizing a neighborhood cleanup, planning a potluck, running a workshop, 
              or building a mutual aid network, Village Vibe provides the tools you need to bring people together.
            </p>
          </CardContent>
        </Card>

        {/* Core Features */}
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-center">Core Features</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Tribes (Communities)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>Create or join affinity groups based on shared interests, values, or geography.</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Custom badges and roles</li>
                  <li>Member management</li>
                  <li>Tribe-specific events and stories</li>
                  <li>Moderation tools for admins</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Event Coordination
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>Host gatherings with flexible coordination tools that work for any event type.</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Roles: Volunteer positions and shifts</li>
                  <li>Items: Resources to bring or provide</li>
                  <li>Actions: Tasks and milestones</li>
                  <li>Outcomes: Post-event impact tracking</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Community Stories
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>Share experiences and knowledge with long-form content.</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Markdown support for rich formatting</li>
                  <li>Cover images and location tags</li>
                  <li>Promote stories to villages</li>
                  <li>Link to events and services</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HandHeart className="h-5 w-5" />
                  Services Marketplace
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>Offer and request help within your community.</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Service offers and requests</li>
                  <li>Trust system with badges</li>
                  <li>Direct messaging coordination</li>
                  <li>Lightning payments/tips</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Badges & Reputation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>Build reputation through participation and contributions.</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Attendance verification with QR codes</li>
                  <li>Event-specific badges</li>
                  <li>Tribe achievement recognition</li>
                  <li>Service reputation tracking</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Direct Messaging
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>Communicate privately with other community members.</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>NIP-04 encrypted messaging</li>
                  <li>Event coordination via DMs</li>
                  <li>Service negotiations</li>
                  <li>Private event details</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Event Coordination System */}
        <Card className="border-purple-500/20 bg-purple-500/5">
          <CardHeader>
            <CardTitle className="text-2xl">🎯 Flexible Event Coordination System</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              Village Vibe introduces a revolutionary approach to event coordination using composable primitives 
              that work for any type of gathering — from community cleanups to fundraisers.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-semibold">
                  <Users className="h-4 w-4 text-purple-600" />
                  Roles
                </div>
                <p className="text-muted-foreground text-xs">
                  Define volunteer positions with slots, shifts, and requirements. 
                  Attendees can claim roles with one tap.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 font-semibold">
                  <Package className="h-4 w-4 text-purple-600" />
                  Items
                </div>
                <p className="text-muted-foreground text-xs">
                  List resources needed with quantities and categories. 
                  People can commit to bringing specific amounts.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 font-semibold">
                  <ListChecks className="h-4 w-4 text-purple-600" />
                  Actions
                </div>
                <p className="text-muted-foreground text-xs">
                  Track preparation tasks with priorities, due dates, and dependencies. 
                  Organizers can assign and monitor progress.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 font-semibold">
                  <Trophy className="h-4 w-4 text-purple-600" />
                  Outcomes
                </div>
                <p className="text-muted-foreground text-xs">
                  Record post-event metrics, stories, photos, and feedback. 
                  Document community impact and success.
                </p>
              </div>
            </div>

            <div className="bg-background p-4 rounded-lg space-y-2">
              <p className="font-semibold">Example: Community Cleanup</p>
              <ul className="text-xs text-muted-foreground space-y-1 ml-4">
                <li><strong>Roles:</strong> Site coordinator (1), Safety monitors (2), Photographer (1)</li>
                <li><strong>Items:</strong> Trash bags (50), Work gloves (20 pairs), First aid kit (1)</li>
                <li><strong>Actions:</strong> Reserve dumpster, Buy supplies, Post on social media</li>
                <li><strong>Outcomes:</strong> 250 lbs trash collected, 15 volunteers, Before/after photos</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* How It Works */}
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-center">How It Works</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <div className="text-3xl mb-2">1️⃣</div>
                <CardTitle>Create or Join a Tribe</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Start your own community or join existing tribes based on shared interests. 
                Each tribe has its own events, stories, and services.
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="text-3xl mb-2">2️⃣</div>
                <CardTitle>Coordinate Events</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Host gatherings with our flexible coordination system. Add roles, items, and tasks. 
                Attendees can RSVP and claim responsibilities.
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="text-3xl mb-2">3️⃣</div>
                <CardTitle>Build Community</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Share stories, earn badges, offer services, and connect with your village. 
                All on the decentralized Nostr network.
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Nostr Integration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Built on Nostr</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              Village Vibe is built entirely on the Nostr protocol, a simple and open protocol for 
              decentralized social networks. This means:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>You own your data</strong> - Your content is signed with your keys</li>
              <li><strong>No central authority</strong> - Connect to any relay, no single point of failure</li>
              <li><strong>Interoperable</strong> - Works with other Nostr apps and clients</li>
              <li><strong>Censorship-resistant</strong> - Your content can't be deleted by a platform</li>
              <li><strong>Portable identity</strong> - Take your identity and content anywhere</li>
            </ul>

            <div className="bg-muted p-4 rounded-lg space-y-2">
              <p className="font-semibold">Custom Nostr Event Kinds Used:</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><Badge variant="outline">36959</Badge> Enhanced Events</div>
                <div><Badge variant="outline">38401-38407</Badge> Coordination Objects</div>
                <div><Badge variant="outline">30023</Badge> Community Stories</div>
                <div><Badge variant="outline">38857</Badge> Service Offers</div>
                <div><Badge variant="outline">30627</Badge> Service Requests</div>
                <div><Badge variant="outline">34550</Badge> Tribes</div>
                <div><Badge variant="outline">31925</Badge> Event RSVPs</div>
                <div><Badge variant="outline">1985</Badge> Labels/Moderation</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Coordination System Details */}
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-center">Event Coordination System</h2>
          
          <Card>
            <CardHeader>
              <CardTitle>Composable Primitives for Any Event Type</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>
                Instead of hard-coding specific event types, Village Vibe uses flexible coordination primitives 
                that can be mixed and matched for any gathering:
              </p>

              <div className="space-y-4">
                <div className="border-l-2 border-purple-500 pl-4">
                  <h4 className="font-semibold text-foreground mb-1">
                    <Users className="h-4 w-4 inline mr-2" />
                    Roles → People Responsibilities
                  </h4>
                  <p className="text-xs">
                    Define volunteer positions with specific time slots, requirements, and number of people needed. 
                    Track who signs up and fill all positions efficiently.
                  </p>
                </div>

                <div className="border-l-2 border-blue-500 pl-4">
                  <h4 className="font-semibold text-foreground mb-1">
                    <Package className="h-4 w-4 inline mr-2" />
                    Items → Physical or Digital Resources
                  </h4>
                  <p className="text-xs">
                    List what's needed (food, tools, supplies) with quantities and units. 
                    People claim items to bring, preventing duplicates and gaps.
                  </p>
                </div>

                <div className="border-l-2 border-green-500 pl-4">
                  <h4 className="font-semibold text-foreground mb-1">
                    <ListChecks className="h-4 w-4 inline mr-2" />
                    Actions → Tasks and Milestones
                  </h4>
                  <p className="text-xs">
                    Create to-do items with priorities, due dates, and dependencies. 
                    Assign tasks and track completion progress.
                  </p>
                </div>

                <div className="border-l-2 border-orange-500 pl-4">
                  <h4 className="font-semibold text-foreground mb-1">
                    <Trophy className="h-4 w-4 inline mr-2" />
                    Outcomes → Results and Impact
                  </h4>
                  <p className="text-xs">
                    Record metrics (attendance, funds raised, items collected), share stories, 
                    upload photos, and collect feedback after events.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Event Type Examples */}
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-center">Works for Any Event Type</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-muted/50">
              <CardHeader>
                <CardTitle className="text-lg">🧹 Community Cleanup</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-2">
                <div><strong>Roles:</strong> Site coordinator, Safety monitors, Photographer</div>
                <div><strong>Items:</strong> Trash bags, Gloves, First aid kit</div>
                <div><strong>Actions:</strong> Reserve dumpster, Buy supplies, Market event</div>
                <div><strong>Outcomes:</strong> 250 lbs collected, 15 volunteers, Photos</div>
              </CardContent>
            </Card>

            <Card className="bg-muted/50">
              <CardHeader>
                <CardTitle className="text-lg">🍲 Potluck Dinner</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-2">
                <div><strong>Roles:</strong> Setup crew, Cleanup crew, Greeter</div>
                <div><strong>Items:</strong> Main dishes, Sides, Desserts, Drinks</div>
                <div><strong>Actions:</strong> Send invites, Set up tables, Coordinate dishes</div>
                <div><strong>Outcomes:</strong> 45 attendees, Favorite dishes, Group photo</div>
              </CardContent>
            </Card>

            <Card className="bg-muted/50">
              <CardHeader>
                <CardTitle className="text-lg">🛠️ Workshop</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-2">
                <div><strong>Roles:</strong> Instructor, Teaching assistant, Note-taker</div>
                <div><strong>Items:</strong> Materials, Tools, Handouts</div>
                <div><strong>Actions:</strong> Prepare slides, Test equipment, Print materials</div>
                <div><strong>Outcomes:</strong> 28 learned skill, 95% completion, Feedback</div>
              </CardContent>
            </Card>

            <Card className="bg-muted/50">
              <CardHeader>
                <CardTitle className="text-lg">💰 Fundraiser</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-2">
                <div><strong>Roles:</strong> Registration, Donations table, Auctioneer</div>
                <div><strong>Items:</strong> Auction items, Promotional materials, Receipt books</div>
                <div><strong>Actions:</strong> Get permits, Recruit donors, Market event</div>
                <div><strong>Outcomes:</strong> $5,250 raised, 45 donors, Impact story</div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Services Marketplace */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <HandHeart className="h-6 w-6" />
              Local Services Marketplace
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              Enable community members to offer and request help for everyday needs like yardwork, 
              pet care, elder visits, errands, and odd jobs.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-semibold text-foreground mb-2">Service Offers</h4>
                <ul className="text-xs space-y-1">
                  <li>• Offer skills and time to your community</li>
                  <li>• Set availability and pricing (optional)</li>
                  <li>• Build reputation through reviews</li>
                  <li>• Geographic scoping (tribe/village)</li>
                </ul>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-semibold text-foreground mb-2">Service Requests</h4>
                <ul className="text-xs space-y-1">
                  <li>• Request help from community members</li>
                  <li>• Direct messaging for coordination</li>
                  <li>• Lightning zaps for gratitude/payment</li>
                  <li>• Trust-based matchmaking</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Villages */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">🏘️ Villages (Geographic Communities)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              Villages aggregate content from multiple tribes in a specific geographic area. 
              Tribe admins can promote events, stories, and services to their local village, 
              helping neighbors discover community activities.
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Geographic discovery of local events and services</li>
              <li>Cross-tribe collaboration in your area</li>
              <li>Village-wide announcements and news</li>
              <li>Connect neighbors across different interest groups</li>
            </ul>
          </CardContent>
        </Card>

        {/* Technical Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">🔧 Technical Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div>
              <h4 className="font-semibold text-foreground mb-2">Technology Stack</h4>
              <div className="flex flex-wrap gap-2">
                <Badge>React 18</Badge>
                <Badge>TypeScript</Badge>
                <Badge>TailwindCSS 3</Badge>
                <Badge>Vite</Badge>
                <Badge>shadcn/ui</Badge>
                <Badge>Nostrify</Badge>
                <Badge>TanStack Query</Badge>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-2">Nostr Features</h4>
              <ul className="list-disc list-inside space-y-1 ml-4 text-xs">
                <li>NIP-01: Basic protocol implementation</li>
                <li>NIP-04: Encrypted direct messages</li>
                <li>NIP-19: Bech32 identifiers (npub, naddr, nevent)</li>
                <li>NIP-23: Long-form content (stories)</li>
                <li>NIP-32: Labels and moderation</li>
                <li>NIP-52: Calendar events (legacy compatibility)</li>
                <li>NIP-57: Lightning zaps</li>
                <li>Custom kinds for coordination and services</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-2">Key Features</h4>
              <ul className="list-disc list-inside space-y-1 ml-4 text-xs">
                <li>Decentralized data storage on Nostr relays</li>
                <li>End-to-end encrypted messaging</li>
                <li>QR code check-ins for event attendance</li>
                <li>Real-time updates with optimistic UI</li>
                <li>Relay switching for content discovery</li>
                <li>Mobile-responsive design</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Getting Started */}
        {!user && (
          <Card className="border-dashed border-2">
            <CardHeader>
              <CardTitle className="text-2xl text-center">Ready to Get Started?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center space-y-4">
                <p className="text-muted-foreground">
                  Join with your Nostr account or create a new one to start building community
                </p>
                <LoginArea className="max-w-60 mx-auto" />
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-center">Select Your Relay</h4>
                <p className="text-xs text-muted-foreground text-center mb-3">
                  Choose a relay to connect to the Nostr network
                </p>
                <RelaySelector className="max-w-sm mx-auto" />
              </div>

              <div className="text-center">
                <Button asChild size="lg" variant="outline">
                  <Link to="/tribes">Browse Public Tribes</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="pt-8 space-y-4 text-center">
          <div className="flex justify-center gap-4 text-sm">
            <Link to="/nip" className="text-muted-foreground hover:text-foreground underline">
              View NIP Documentation
            </Link>
          </div>
          
          <div className="text-sm text-muted-foreground">
            <p>
              Vibed with{" "}
              <a
                href="https://soapbox.pub/mkstack"
                className="underline hover:text-foreground"
                target="_blank"
                rel="noopener noreferrer"
              >
                MKStack
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AboutPage;
