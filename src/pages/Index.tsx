import { useSeoMeta } from '@unhead/react';
import { Link } from 'react-router-dom';
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { LoginArea } from "@/components/auth/LoginArea";
import { RelaySelector } from "@/components/RelaySelector";
import { MyTribes } from "@/components/tribes/MyTribes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const Index = () => {
  const { user } = useCurrentUser();

  useSeoMeta({
    title: 'Village Vibe - Connect Communities, Share Stories, Host Events',
    description: 'A Nostr-native app for joining tribes, sharing stories, hosting events, and connecting with your village community.',
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            🏘️ Village Vibe
          </h1>
          <p className="text-xl text-muted-foreground">
            Connect communities, share stories, and host events
          </p>
        </div>

        {!user && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <Card className="border-dashed border-2">
              <CardHeader>
                <CardTitle className="text-2xl">Join the Fun! 🎉</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    Connect with your Nostr account to create and join tribes
                  </p>
                  <LoginArea className="max-w-60 mx-auto" />
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Choose Your Relay</h3>
                  <p className="text-sm text-muted-foreground">
                    Select a relay to connect to the Nostr network
                  </p>
                  <RelaySelector className="max-w-sm mx-auto" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-dashed border-2">
              <CardHeader>
                <CardTitle className="text-2xl">Browse Tribes 🔍</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    Explore public communities and see what's happening
                  </p>
                  <Button asChild className="w-full max-w-60 mx-auto">
                    <Link to="/tribes">
                      Browse All Tribes
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <MyTribes />

        {!user && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-2">
                  <div className="text-2xl">👥</div>
                  <h3 className="font-semibold">Create Tribes</h3>
                  <p className="text-sm text-muted-foreground">
                    Start your own community with custom badges and events
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-2">
                  <div className="text-2xl">📅</div>
                  <h3 className="font-semibold">Host Events</h3>
                  <p className="text-sm text-muted-foreground">
                    Announce meetups and verify attendance with QR codes
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-2">
                  <div className="text-2xl">🏆</div>
                  <h3 className="font-semibold">Earn Badges</h3>
                  <p className="text-sm text-muted-foreground">
                    Show up to events and collect unique attendance badges
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="pt-8 text-sm text-muted-foreground text-center">
          <p>
            Vibed with{" "}
            <a
              href="https://soapbox.pub/mkstack"
              className="underline hover:text-foreground"
            >
              MKStack
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;