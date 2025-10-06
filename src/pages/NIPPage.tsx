import { DownloadNIP } from "@/components/DownloadNIP";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Code, Users } from "lucide-react";

export function NIPPage() {
  return (
    <div className="container max-w-4xl mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2">
          <FileText className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Village Vibe NIP</h1>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Custom Nostr Implementation Protocol for community stories, events, and village aggregation
        </p>
      </div>

      {/* Download Card */}
      <Card className="border-2 border-primary/20">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Download className="h-5 w-5" />
            Download NIP Document
          </CardTitle>
          <CardDescription>
            Get the complete technical specification for Village Vibe's custom Nostr protocol extensions
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <DownloadNIP />
          <p className="text-sm text-muted-foreground mt-3">
            Markdown format • ~15KB • Updated September 2025
          </p>
        </CardContent>
      </Card>

      {/* Overview Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Custom Event Kinds
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Enhanced Events</span>
              <Badge variant="secondary">Kind 36959</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Community Stories</span>
              <Badge variant="secondary">Kind 30023</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Moderation Labels</span>
              <Badge variant="secondary">Kind 1985</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Extends existing NIPs (23, 32, 52) for community-focused features
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Key Features
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm">• Multi-type community events</div>
            <div className="text-sm">• Private event coordination</div>
            <div className="text-sm">• Village content aggregation</div>
            <div className="text-sm">• Story promotion system</div>
            <div className="text-sm">• Location-based privacy</div>
            <div className="text-sm">• Tribe-to-village workflows</div>
            <p className="text-xs text-muted-foreground mt-4">
              Designed for local community building and coordination
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Implementation Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Implementation Highlights</CardTitle>
          <CardDescription>
            Key design decisions and technical considerations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Privacy & Security</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Coordinates rounded to ~11m precision</li>
                <li>• Private event details via NIP-04 DMs</li>
                <li>• Additive, non-destructive moderation</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Interoperability</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Based on established NIPs</li>
                <li>• Parameterized replaceable events</li>
                <li>• NIP-31 alt tags for compatibility</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-center text-sm text-muted-foreground">
        <p>
          This NIP document describes the custom protocol extensions used by Village Vibe.
          For questions or contributions, please refer to the project documentation.
        </p>
      </div>
    </div>
  );
}