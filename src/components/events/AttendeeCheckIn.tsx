import { useState, useRef, useEffect } from "react";
import type { NostrEvent } from "@nostrify/nostrify";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useNostrPublish } from "@/hooks/useNostrPublish";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/useToast";
import { QrCode, Loader2, CheckCircle, Camera, X } from "lucide-react";
import QrScanner from "qr-scanner";

interface AttendeeCheckInProps {
  event: NostrEvent;
  eventId: string;
}

export function AttendeeCheckIn({ event, eventId }: AttendeeCheckInProps) {
  const { user } = useCurrentUser();
  const { mutate: createEvent, isPending: isSubmitting } = useNostrPublish();
  const { toast } = useToast();

  const [checkInCode, setCheckInCode] = useState('');
  const [location, setLocation] = useState('');
  const [note, setNote] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop();
        scannerRef.current.destroy();
      }
    };
  }, []);

  const startScanning = async () => {
    try {
      setIsScanning(true);
      setScannerError(null);

      // Simple check first
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported by this browser');
      }

      // Check if QR Scanner is supported
      const hasCamera = await QrScanner.hasCamera();
      if (!hasCamera) {
        throw new Error('No camera found on this device');
      }

      // Wait a bit for the dialog to open and video element to be ready
      await new Promise(resolve => setTimeout(resolve, 200));

      if (!videoRef.current) {
        throw new Error('Video element not ready');
      }

      const scanner = new QrScanner(
        videoRef.current,
        (result) => {
          console.log('QR Code detected:', result.data);

          // Show what was scanned in a popup first
          const scannedContent = result.data;

          // Try to extract 13-digit number from the scanned data
          const digitMatch = scannedContent.match(/\d{13}/);
          if (digitMatch) {
            const code = digitMatch[0];
            setCheckInCode(code);
            stopScanning();
            toast({
              title: "QR Code Scanned Successfully!",
              description: `Content: "${scannedContent.slice(0, 100)}${scannedContent.length > 100 ? '...' : ''}" | Extracted Code: ${code}`,
              duration: 5000,
            });
          } else if (/^\d{13}$/.test(scannedContent)) {
            // Check if it's exactly 13 digits
            setCheckInCode(scannedContent);
            stopScanning();
            toast({
              title: "QR Code Scanned Successfully!",
              description: `Code: ${scannedContent}`,
              duration: 5000,
            });
          } else {
            // Show what was actually scanned
            toast({
              title: "QR Code Read",
              description: `Content: "${scannedContent.slice(0, 100)}${scannedContent.length > 100 ? '...' : ''}" - No valid 13-digit code found`,
              variant: "destructive",
              duration: 5000,
            });
          }
        },
        {
          highlightScanRegion: true,
          highlightCodeOutline: true,
          maxScansPerSecond: 10, // Increase scan frequency
          preferredCamera: 'environment', // Use back camera on mobile
        }
      );

      scannerRef.current = scanner;
      await scanner.start();
    } catch (error) {
      console.error('Error starting scanner:', error);
      setScannerError(error instanceof Error ? error.message : 'Failed to start camera');
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    if (scannerRef.current) {
      scannerRef.current.stop();
      scannerRef.current.destroy();
      scannerRef.current = null;
    }
    setIsScanning(false);
    setScannerError(null);
  };

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to check in",
        variant: "destructive",
      });
      return;
    }

    if (!checkInCode.trim() || checkInCode.length !== 13) {
      toast({
        title: "Error",
        description: "Please enter a valid 13-digit check-in code",
        variant: "destructive",
      });
      return;
    }

    // Validate that the code is all digits
    if (!/^\d{13}$/.test(checkInCode)) {
      toast({
        title: "Error",
        description: "Check-in code must be exactly 13 digits",
        variant: "destructive",
      });
      return;
    }

    try {
      const tags = [
        ['a', `${event.kind}:${eventId}`], // Reference to event using its actual kind
        ['e', event.id], // Reference to specific event revision
        ['p', event.pubkey], // Event host pubkey
        ['nonce', checkInCode.trim()], // 13-digit verification code
        ['verified_at', Math.floor(Date.now() / 1000).toString()], // Current timestamp
        ['alt', `Attendance verification for ${event.tags.find(([name]) => name === 'title')?.[1] || 'event'}`],
      ];

      if (location.trim()) {
        tags.push(['location', location.trim()]);
      }

      createEvent({
        kind: 2073, // Custom attendance verification kind
        content: note.trim() || `Checked in to ${event.tags.find(([name]) => name === 'title')?.[1] || 'event'}`,
        tags,
      });

      toast({
        title: "🎉 Checked In Successfully!",
        description: "Your attendance has been verified. Badge incoming!",
      });

      // Clear form
      setCheckInCode('');
      setLocation('');
      setNote('');
    } catch (error) {
      console.error('Error checking in:', error);
      toast({
        title: "Error",
        description: "Failed to check in. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Event Check-In
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            Log in to check in to this event
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          Event Check-In
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleCheckIn} className="space-y-6">
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2">How to Check In:</h4>
              <ol className="text-sm space-y-1 list-decimal list-inside text-muted-foreground">
                <li>Scan the QR code shown by the event host</li>
                <li>Enter the 13-digit number below</li>
                <li>Add optional location/note</li>
                <li>Click "Check In" to verify your attendance</li>
              </ol>
            </div>

            <div className="space-y-2">
              <Label htmlFor="checkin-code">Check-In Code *</Label>
              <div className="flex gap-2">
                <Input
                  id="checkin-code"
                  value={checkInCode}
                  onChange={(e) => setCheckInCode(e.target.value.replace(/\D/g, '').slice(0, 13))}
                  placeholder="Enter 13-digit code"
                  className="font-mono text-lg text-center flex-1"
                  maxLength={13}
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  size="default"
                  onClick={startScanning}
                  disabled={isSubmitting}
                  className="px-3"
                  title="Scan QR code with camera"
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">
                {checkInCode.length}/13 digits • Click camera to scan QR code
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location (Optional)</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Where are you checking in from?"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Note (Optional)</Label>
              <Textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note about your attendance..."
                rows={3}
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting || checkInCode.length !== 13}
            className="w-full"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Checking In...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Check In to Event
              </>
            )}
          </Button>
        </form>

        {/* QR Scanner Dialog */}
        <Dialog open={isScanning} onOpenChange={(open) => !open && stopScanning()}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Scan QR Code
                </span>
                <Button variant="ghost" size="sm" onClick={stopScanning}>
                  <X className="h-4 w-4" />
                </Button>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {scannerError ? (
                <div className="text-center space-y-4">
                  <div className="text-red-600 text-sm">{scannerError}</div>
                  <Button onClick={startScanning} variant="outline">
                    Try Again
                  </Button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <video
                      ref={videoRef}
                      className="w-full h-64 bg-black rounded-lg"
                      playsInline
                    />
                  </div>
                  <div className="text-center text-sm text-muted-foreground">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span>Scanning actively...</span>
                    </div>
                    Position the QR code within the camera view. Detection happens automatically.
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={stopScanning} variant="outline" className="flex-1">
                      Cancel
                    </Button>
                    <Button onClick={async () => {
                      // Force a manual scan attempt
                      if (scannerRef.current && videoRef.current) {
                        try {
                          // Try to capture and scan current frame
                          const canvas = document.createElement('canvas');
                          const context = canvas.getContext('2d');
                          if (context && videoRef.current.videoWidth > 0) {
                            canvas.width = videoRef.current.videoWidth;
                            canvas.height = videoRef.current.videoHeight;
                            context.drawImage(videoRef.current, 0, 0);

                            // Try to scan the captured frame
                            const result = await QrScanner.scanImage(canvas);
                            console.log('Manual scan result:', result);

                            // Process the result
                            const scannedContent = result;
                            const digitMatch = scannedContent.match(/\d{13}/);
                            if (digitMatch) {
                              const code = digitMatch[0];
                              setCheckInCode(code);
                              stopScanning();
                              toast({
                                title: "Manual Scan Successful!",
                                description: `Content: "${scannedContent.slice(0, 100)}${scannedContent.length > 100 ? '...' : ''}" | Code: ${code}`,
                                duration: 5000,
                              });
                            } else {
                              toast({
                                title: "Manual Scan Result",
                                description: `Content: "${scannedContent.slice(0, 100)}${scannedContent.length > 100 ? '...' : ''}" - No 13-digit code found`,
                                variant: "destructive",
                                duration: 5000,
                              });
                            }
                          } else {
                            toast({
                              title: "Scan Failed",
                              description: "Camera not ready or no video feed",
                              variant: "destructive",
                            });
                          }
                        } catch (error) {
                          console.error('Manual scan error:', error);
                          toast({
                            title: "No QR Code Found",
                            description: "Point camera directly at QR code and try again",
                            variant: "destructive",
                          });
                        }
                      }
                    }} variant="default" className="flex-1">
                      Scan Now
                    </Button>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}