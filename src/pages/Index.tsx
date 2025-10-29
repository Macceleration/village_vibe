import { useSeoMeta } from '@unhead/react';
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { MyTribes } from "@/components/tribes/MyTribes";
import { AboutPage } from './About';

const Index = () => {
  const { user } = useCurrentUser();

  useSeoMeta({
    title: 'Village Vibe - Connect Communities, Share Stories, Host Events',
    description: 'A Nostr-native app for joining tribes, sharing stories, and hosting events.',
  });

  // If not logged in, show About page
  if (!user) {
    return <AboutPage />;
  }

  // Logged-in users see their tribes dashboard
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            🏘️ Village Vibe
          </h1>
          <p className="text-xl text-muted-foreground">
            Your Communities
          </p>
        </div>

        <MyTribes />

        <div className="pt-8 text-sm text-muted-foreground text-center">
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
  );
};

export default Index;
