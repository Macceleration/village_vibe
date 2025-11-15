import { Link, useLocation } from "react-router-dom";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useRelayHealth } from "@/hooks/useRelayHealth";
import { useAppContext } from "@/hooks/useAppContext";
import { LoginArea } from "@/components/auth/LoginArea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuthor } from "@/hooks/useAuthor";
import { genUserName } from "@/lib/genUserName";
import { User, Settings, MessageCircle, Wifi, WifiOff } from "lucide-react";

export function Navigation() {
  const location = useLocation();
  const { user } = useCurrentUser();
  const { config } = useAppContext();
  const { data: relayHealth } = useRelayHealth();
  const author = useAuthor(user?.pubkey);

  const metadata = author.data?.metadata;
  const displayName = metadata?.name || metadata?.display_name || (user ? genUserName(user.pubkey) : '');

  const relayName = config.relayUrl.replace('wss://', '').replace('ws://', '').split('/')[0];

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 font-bold text-xl">
            <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              🏘️ Village Vibe
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              to="/"
              className={`text-sm font-medium transition-colors hover:text-primary ${
                location.pathname === '/' ? 'text-foreground' : 'text-muted-foreground'
              }`}
            >
              Home
            </Link>
            <Link
              to="/tribes"
              className={`text-sm font-medium transition-colors hover:text-primary ${
                location.pathname === '/tribes' ? 'text-foreground' : 'text-muted-foreground'
              }`}
            >
              Tribes
            </Link>
            <Link
              to="/village"
              className={`text-sm font-medium transition-colors hover:text-primary ${
                location.pathname.startsWith('/village') ? 'text-foreground' : 'text-muted-foreground'
              }`}
            >
              Village
            </Link>
            {user && (
              <Link
                to="/messages"
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  location.pathname === '/messages' ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                Messages
              </Link>
            )}
            <Link
              to="/about"
              className={`text-sm font-medium transition-colors hover:text-primary ${
                location.pathname === '/about' ? 'text-foreground' : 'text-muted-foreground'
              }`}
            >
              About
            </Link>

            {/* Relay Status Indicator */}
            <div className="flex items-center gap-2 text-xs">
              {relayHealth?.status === 'connected' ? (
                <div className="flex items-center gap-1 text-green-600">
                  <Wifi className="h-3 w-3" />
                  <span className="hidden lg:inline">{relayName}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-red-600">
                  <WifiOff className="h-3 w-3" />
                  <span className="hidden lg:inline">Disconnected</span>
                </div>
              )}
              {relayHealth?.latency && relayHealth.latency > 1000 && (
                <Badge variant="destructive" className="text-[10px] h-4">Slow</Badge>
              )}
            </div>
          </div>

          {/* User Area */}
          <div className="flex items-center gap-4">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={metadata?.picture} alt={displayName} />
                      <AvatarFallback>
                        {displayName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <div className="flex items-center justify-start gap-2 p-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={metadata?.picture} alt={displayName} />
                      <AvatarFallback>
                        {displayName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{displayName}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.pubkey.slice(0, 8)}...
                      </p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to={`/profile/${user.pubkey}`} className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/messages" className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4" />
                      Messages
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/settings/profile" className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <div className="p-2">
                    <LoginArea className="w-full" />
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <LoginArea className="max-w-48" />
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}