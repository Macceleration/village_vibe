import { useState } from "react";
import type { NostrEvent } from "@nostrify/nostrify";
import { useNostr } from '@nostrify/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useNostrPublish } from "@/hooks/useNostrPublish";
import { useAuthor } from "@/hooks/useAuthor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/useToast";
import { genUserName } from "@/lib/genUserName";
import { generateTribeServicesQR, generateTribeServicesPoster, downloadQRCode, downloadSVGPoster } from "@/lib/qrGenerator";
import { AdminServicesPanel } from "../services/AdminServicesPanel";
import { Settings, UserCheck, UserX, Users, Loader2, QrCode, Download } from "lucide-react";

interface TribeAdminPanelProps {
  tribe: NostrEvent;
  tribeId: string;
}

interface JoinRequestCardProps {
  request: NostrEvent;
  onApprove: (request: NostrEvent) => void;
  onReject: (request: NostrEvent) => void;
  isProcessing: boolean;
}

function JoinRequestCard({ request, onApprove, onReject, isProcessing }: JoinRequestCardProps) {
  const author = useAuthor(request.pubkey);
  const metadata = author.data?.metadata;
  const displayName = metadata?.name || metadata?.display_name || genUserName(request.pubkey);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={metadata?.picture} alt={displayName} />
              <AvatarFallback>
                {displayName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h4 className="font-medium">{displayName}</h4>
              <p className="text-sm text-muted-foreground">
                {new Date(request.created_at * 1000).toLocaleDateString()}
              </p>
              {request.content && (
                <p className="text-sm text-muted-foreground mt-1">
                  "{request.content}"
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => onApprove(request)}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserCheck className="h-4 w-4" />
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onReject(request)}
              disabled={isProcessing}
            >
              <UserX className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function TribeAdminPanel({ tribe, tribeId }: TribeAdminPanelProps) {
  const { user } = useCurrentUser();
  const { nostr } = useNostr();
  const queryClient = useQueryClient();
  const { mutate: createEvent, isPending: isProcessing } = useNostrPublish();
  const { toast } = useToast();

  const [processingRequest, setProcessingRequest] = useState<string | null>(null);
  const [isCleaningDuplicates, setIsCleaningDuplicates] = useState(false);
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);

  // Check if user is admin
  const userRole = tribe.tags.find(([name, pubkey, , role]) =>
    name === 'p' && pubkey === user?.pubkey && (role === 'admin' || role === 'moderator')
  )?.[3];

  const isAdmin = userRole === 'admin';
  const isModerator = userRole === 'moderator' || isAdmin;

  // Query for join requests and rejections
  const { data: joinRequests, isLoading: requestsLoading, refetch } = useQuery({
    queryKey: ['join-requests', tribeId],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(1500)]);

      // Get join requests and rejection events
      const [requests, rejections] = await Promise.all([
        nostr.query([
          {
            kinds: [9021], // Join request (NIP-29)
            '#h': [tribeId],
            limit: 100,
          }
        ], { signal }),
        nostr.query([
          {
            kinds: [9022], // Join rejection (custom kind)
            '#h': [tribeId],
            limit: 100,
          }
        ], { signal })
      ]);

      // Get current tribe members
      const currentMembers = new Set(
        tribe.tags
          .filter(([name]) => name === 'p')
          .map(([, pubkey]) => pubkey)
      );

      // Get rejected pubkeys
      const rejectedPubkeys = new Set(
        rejections.map(rejection => {
          const rejectedPubkey = rejection.tags.find(([name]) => name === 'p')?.[1];
          return rejectedPubkey;
        }).filter(Boolean)
      );

      // Filter out requests from users who are already members or have been rejected
      const filteredRequests = requests.filter(request => {
        return !currentMembers.has(request.pubkey) && !rejectedPubkeys.has(request.pubkey);
      });

      // Remove duplicate requests (keep only the latest per user)
      const uniqueRequests = filteredRequests.reduce((acc, request) => {
        const existing = acc.find(r => r.pubkey === request.pubkey);
        if (!existing || request.created_at > existing.created_at) {
          return [...acc.filter(r => r.pubkey !== request.pubkey), request];
        }
        return acc;
      }, [] as NostrEvent[]);

      return uniqueRequests.sort((a, b) => b.created_at - a.created_at);
    },
    enabled: isModerator,
  });

  const handleApprove = async (request: NostrEvent) => {
    setProcessingRequest(request.id);

    try {
      // Check if user is already a member
      const isAlreadyMember = tribe.tags.some(([name, pubkey]) =>
        name === 'p' && pubkey === request.pubkey
      );

      if (isAlreadyMember) {
        toast({
          title: "Already a Member",
          description: "This user is already a member of the tribe",
          variant: "destructive",
        });
        refetch();
        return;
      }

      // Add user to tribe by updating tribe definition
      const currentTags = [...tribe.tags];

      // Add the user as a member (only if not already present)
      currentTags.push(['p', request.pubkey, '', 'member']);

      createEvent({
        kind: 34550, // Update tribe definition
        content: tribe.content,
        tags: currentTags,
      });

      toast({
        title: "✅ Member Approved!",
        description: "User has been added to the tribe",
      });

      refetch();
    } catch (error) {
      console.error('Error approving member:', error);
      toast({
        title: "Error",
        description: "Failed to approve member",
        variant: "destructive",
      });
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleReject = async (request: NostrEvent) => {
    setProcessingRequest(request.id);

    try {
      // Create a rejection event to track rejected users
      createEvent({
        kind: 9022, // Join rejection (custom kind)
        content: `Join request rejected for tribe ${tribeId}`,
        tags: [
          ['h', tribeId], // Group identifier
          ['p', request.pubkey], // Rejected user
          ['e', request.id], // Original request event
        ],
      });

      toast({
        title: "❌ Request Rejected",
        description: "Join request has been rejected and removed",
      });

      refetch();
    } catch (error) {
      console.error('Error rejecting member:', error);
      toast({
        title: "Error",
        description: "Failed to reject request",
        variant: "destructive",
      });
    } finally {
      setProcessingRequest(null);
    }
  };

  const cleanDuplicateMembers = async () => {
    setIsCleaningDuplicates(true);

    try {
      // Create a map to deduplicate members by pubkey, keeping highest role
      const memberMap = new Map<string, [string, string, string, string]>();
      const nonMemberTags: Array<[string, string, string?, string?]> = [];

      // Role hierarchy: admin > moderator > event_creator > member/undefined
      const roleHierarchy = { admin: 4, moderator: 3, event_creator: 2, member: 1 };

      tribe.tags.forEach(tag => {
        if (tag[0] === 'p') {
          const [name, pubkey, relay = '', role = ''] = tag;
          const existing = memberMap.get(pubkey);

          const currentRoleValue = roleHierarchy[role as keyof typeof roleHierarchy] || 1;
          const existingRoleValue = existing ? (roleHierarchy[existing[3] as keyof typeof roleHierarchy] || 1) : 0;

          if (!existing || currentRoleValue > existingRoleValue) {
            memberMap.set(pubkey, [name, pubkey, relay, role]);
          }
        } else {
          // Keep all non-member tags as-is
          nonMemberTags.push(tag as [string, string, string?, string?]);
        }
      });

      // Combine deduplicated member tags with other tags
      const cleanedTags = [
        ...nonMemberTags,
        ...Array.from(memberMap.values())
      ];

      // Check if there were actually duplicates
      const originalMemberCount = tribe.tags.filter(([name]) => name === 'p').length;
      const cleanedMemberCount = memberMap.size;

      if (originalMemberCount === cleanedMemberCount) {
        toast({
          title: "No Duplicates Found",
          description: "This tribe doesn't have any duplicate members",
        });
        return;
      }

      createEvent({
        kind: 34550,
        content: tribe.content,
        tags: cleanedTags,
      });

      toast({
        title: "✅ Duplicates Cleaned!",
        description: `Removed ${originalMemberCount - cleanedMemberCount} duplicate member entries`,
      });

      // Invalidate related queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['tribe', tribeId] });
      queryClient.invalidateQueries({ queryKey: ['tribe-member-count', tribeId] });
      queryClient.invalidateQueries({ queryKey: ['my-tribes'] });
      queryClient.invalidateQueries({ queryKey: ['public-tribes'] });
    } catch (error) {
      console.error('Error cleaning duplicates:', error);
      toast({
        title: "Error",
        description: "Failed to clean duplicate members",
        variant: "destructive",
      });
    } finally {
      setIsCleaningDuplicates(false);
    }
  };

  const handleGenerateQR = async () => {
    setIsGeneratingQR(true);
    try {
      const tribeName = tribe.tags.find(([name]) => name === 'name')?.[1] ||
                       tribe.tags.find(([name]) => name === 'd')?.[1] ||
                       'Tribe';

      const qrDataUrl = await generateTribeServicesQR(tribeId);
      downloadQRCode(qrDataUrl, `${tribeName}-services-qr.png`);

      toast({
        title: "QR Code Generated",
        description: "Services QR code has been downloaded",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to generate QR code",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingQR(false);
    }
  };

  const handleGeneratePoster = async () => {
    setIsGeneratingQR(true);
    try {
      const tribeName = tribe.tags.find(([name]) => name === 'name')?.[1] ||
                       tribe.tags.find(([name]) => name === 'd')?.[1] ||
                       'Tribe';

      const poster = await generateTribeServicesPoster(tribeId, tribeName);
      downloadSVGPoster(poster, `${tribeName}-services-poster.svg`);

      toast({
        title: "Poster Generated",
        description: "Services poster has been downloaded",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to generate poster",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingQR(false);
    }
  };

  if (!isModerator) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Tribe Administration
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="requests">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="requests" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Requests
              {joinRequests && joinRequests.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {joinRequests.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="moderate-services" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Services
            </TabsTrigger>
            <TabsTrigger value="services-qr" className="flex items-center gap-2">
              <QrCode className="h-4 w-4" />
              QR Codes
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="requests" className="space-y-4">
            {requestsLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-muted rounded-full animate-pulse" />
                        <div className="space-y-2">
                          <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                          <div className="h-3 w-16 bg-muted rounded animate-pulse" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : joinRequests && joinRequests.length > 0 ? (
              <div className="space-y-4">
                {joinRequests.map((request) => (
                  <JoinRequestCard
                    key={request.id}
                    request={request}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    isProcessing={processingRequest === request.id || isProcessing}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <h3 className="font-semibold mb-1">No pending requests</h3>
                <p className="text-sm text-muted-foreground">
                  Join requests will appear here for approval
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="moderate-services">
            <AdminServicesPanel tribeId={tribeId} />
          </TabsContent>

          <TabsContent value="services-qr" className="space-y-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Services QR Codes</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Generate QR codes and posters to promote your tribe's services
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Button
                    onClick={handleGenerateQR}
                    disabled={isGeneratingQR}
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center gap-2"
                  >
                    {isGeneratingQR ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      <QrCode className="h-6 w-6" />
                    )}
                    <div className="text-center">
                      <div className="font-medium">QR Code</div>
                      <div className="text-xs text-muted-foreground">
                        Download PNG for digital use
                      </div>
                    </div>
                  </Button>

                  <Button
                    onClick={handleGeneratePoster}
                    disabled={isGeneratingQR}
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center gap-2"
                  >
                    {isGeneratingQR ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      <Download className="h-6 w-6" />
                    )}
                    <div className="text-center">
                      <div className="font-medium">Poster</div>
                      <div className="text-xs text-muted-foreground">
                        Download SVG for printing
                      </div>
                    </div>
                  </Button>
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">How to use:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• QR Code: Share digitally or print for local posting</li>
                  <li>• Poster: Print and display in community spaces</li>
                  <li>• Both link directly to your tribe's Services tab</li>
                  <li>• Helps neighbors discover and offer local services</li>
                </ul>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Member Management</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Clean up duplicate member entries and manage tribe membership
                </p>

                <Button
                  onClick={cleanDuplicateMembers}
                  disabled={isCleaningDuplicates}
                  variant="outline"
                >
                  {isCleaningDuplicates ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Users className="h-4 w-4 mr-2" />
                  )}
                  Clean Duplicate Members
                </Button>
              </div>
            </div>

            <div className="text-center py-8 border-t">
              <Settings className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <h3 className="font-semibold mb-1">More Settings</h3>
              <p className="text-sm text-muted-foreground">
                Additional tribe settings coming soon
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}