# Event Publishing Fix

## Problem Identified

Events created through the site were not appearing in the tribe events tab because **they were never actually published to Nostr**.

### Root Cause

The `useCreateEnhancedEvent` hook in `/src/hooks/useEvents.ts` was only **preparing the event data** but not **publishing it to the relay**. The hook would:

1. ✅ Generate event data structure
2. ✅ Create all necessary tags
3. ❌ **NEVER call useNostrPublish to actually publish the event**

The event data was being created in memory but never sent to the Nostr relay, which is why:
- No events appeared in the tribe events list
- Debug tools showed 0 events
- The relay had no record of the events

## Solution Implemented

### 1. Fixed Event Publishing (Critical)

**File**: `/src/components/events/CreateEventDialog.tsx`

Added the missing publishing step:

```typescript
import { useNostrPublish } from "@/hooks/useNostrPublish";

// In component:
const { mutate: publishEvent } = useNostrPublish();

// In createEnhancedEvent onSuccess:
publishEvent(result.eventData, {
  onSuccess: (publishedEvent) => {
    console.log('✅ Event published successfully:', publishedEvent);
  },
  onError: (publishError) => {
    console.error('❌ Failed to publish event:', publishError);
    toast({
      title: "Publishing Error",
      description: "Event was created but failed to publish to relay.",
      variant: "destructive",
    });
  },
});
```

### 2. Created Comprehensive Debug Tool

**File**: `/src/components/events/DebugEventsDialog.tsx` (NEW)

A powerful debugging tool that shows:

- **Multiple query strategies**: Tests different ways events might be tagged
- **Real-time results**: Shows exactly what's on the relay
- **Sample events**: Displays event structure and tags
- **Error detection**: Identifies query failures
- **Troubleshooting tips**: Provides actionable next steps

**Features**:
- Query events by tribe dTag only
- Query events by full tribe ID
- Query all events with client-side filtering
- Show user's own events
- Query legacy NIP-52 events
- Copy full debug data as JSON
- Detailed recommendations when no events found

### 3. Integrated Debug Tool

**File**: `/src/components/tribes/TribeEvents.tsx`

Added debug button to tribe events tab:
- Shows event count
- Quick access to debug tool
- Always visible for troubleshooting

## How to Use

### For Users

1. **Create an event** using the Create Event button
2. If events don't appear immediately, click **"Debug Events"** button
3. The debug tool will show:
   - How many events exist
   - Which queries found events
   - Sample event data
   - Troubleshooting tips if no events found

### For Developers

The debug tool provides detailed information for troubleshooting:

- **Check "Your Enhanced Events"** to see if events are being published
- **Verify tribe tags** match expected format
- **Compare filters** to see which query strategies work
- **Copy JSON data** for detailed analysis

## Testing Checklist

- [x] TypeScript compilation passes
- [x] Build completes successfully
- [ ] Create a new event
- [ ] Verify event appears in tribe events list
- [ ] Test debug tool shows correct event count
- [ ] Verify event queries work with different strategies

## Next Steps

1. **Test event creation** - Create a test event and verify it publishes
2. **Verify queries** - Check that existing events appear correctly
3. **Test different relays** - Ensure events sync across relays
4. **Monitor console logs** - Watch for publish success/error messages

## Additional Notes

- Events are now published immediately after creation
- Success/error feedback is provided to users
- Debug tool helps diagnose relay-specific issues
- Console logs track the full event lifecycle
