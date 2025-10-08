# Events Debugging Guide

## Problem Summary
Events were not showing up on the tribe pages, with console logs showing:
- Enhanced events: 0
- Legacy events: 0
- Valid events: 0

## Root Cause Analysis

The issue was in the tribe ID format handling between event creation and event querying:

### 1. Tribe ID Format Inconsistency
- **Expected format**: `pubkey:dTag` (NIP-72 addressing)
- **Event creation**: Was using only `dTag` in tribe tag
- **Event querying**: Was querying for both `dTag` and full tribe ID

### 2. Query Strategy Issues
- Single query approach was too restrictive
- No fallback strategies for different tribe tag formats
- Missing comprehensive error handling

## Solutions Implemented

### 1. Enhanced EventDebug Component
Created `/src/components/events/EventDebug.tsx` with:
- Inconspicuous collapsible interface
- Multiple query strategies testing
- Real-time diagnostics
- Event validation and status display
- Tribe ID format debugging

### 2. Improved useEvents Hook
Updated `/src/hooks/useEvents.ts` with:

#### Multiple Query Strategies
```typescript
// Enhanced Events
- Strategy 1: Query by dTag (current format)
- Strategy 2: Query by full tribeId (fallback)

// Legacy Events
- Strategy 1: Query by #a tag with tribe reference
- Strategy 2: Query by author + client-side filtering
```

#### Better Error Handling
- Graceful fallbacks when queries fail
- Detailed console logging for debugging
- Tribe ID format validation

### 3. Fixed Event Creation
Updated `/src/components/events/CreateEventDialog.tsx`:
- Now passes full tribeId instead of just dTag
- Proper tribe tag format handling

Updated `/src/hooks/useEvents.ts` useCreateEnhancedEvent:
- Smart parsing of tribeId format
- Consistent tribe tag usage

## Debug Tool Usage

### Accessing Debug Info
1. Navigate to any tribe page
2. Look for "Event Debug Info" section
3. Click to expand and see detailed diagnostics

### Running Diagnostics
1. Click "Run Diagnostics" button
2. Review query results for each strategy
3. Check which queries return events
4. Validate event formats and tribe tags

### Key Debug Information
- **Tribe ID Format**: Shows how tribeId is parsed
- **Query Results**: Each strategy's success/failure
- **Event Validation**: Status of found events
- **Tag Analysis**: Tribe and event type tags

## Troubleshooting Steps

### If events show 0 results:

1. **Check Tribe ID Format**
   - Verify tribeId is in `pubkey:dTag` format
   - Debug panel shows parsed components

2. **Run Diagnostics**
   - Check which query strategies return results
   - Look for events in "Events by Author" queries

3. **Validate Event Creation**
   - Create a new test event
   - Check console logs for tribe tag format
   - Verify event appears in debug panel

4. **Check Relay Connectivity**
   - Try switching relays using RelaySelector
   - Verify events exist on the relay

### If events show in author queries but not tribe queries:

1. **Tribe Tag Mismatch**
   - Events created with wrong tribe tag format
   - Use debug panel to see actual tribe tags on events

2. **Legacy vs Enhanced Events**
   - Check if events are kind 36959 or 31923
   - Verify appropriate query strategies

## Event Format Support

### Current Format: Enhanced Events with Event Types (Kind 36959)
**Created after October 2025**

```json
{
  "kind": 36959,
  "tags": [
    ["d", "event-identifier"],
    ["tribe", "tribe-dTag"],
    ["title", "Event Title"],
    ["start", "timestamp"],
    ["place", "Location"],
    ["l", "lat,lon"],
    ["visibility", "public"],
    ["etype", "meetup"],           // NEW: Event type classification
    ["etype", "potluck"]            // NEW: Multiple types supported
  ]
}
```

**New Features:**
- Multi-type classification (meetup, potluck, workshop, etc.)
- Type-specific metadata (food slots, tasks, instructors, etc.)
- Stricter validation

### Older Format: Enhanced Events without Event Types (Kind 36959)
**Created before October 2025**

```json
{
  "kind": 36959,
  "tags": [
    ["d", "event-identifier"],
    ["tribe", "tribe-dTag"],
    ["title", "Event Title"],
    ["start", "timestamp"],
    ["place", "Location"],
    ["l", "lat,lon"],
    ["visibility", "public"]
    // NO etype tags
  ]
}
```

**Backward Compatibility:**
- Events without `etype` tags are still valid
- Displayed with default event type icon
- Full functionality maintained

### Legacy Events (Kind 31923 - NIP-52)
**Original calendar event format**

```json
{
  "kind": 31923,
  "tags": [
    ["d", "event-identifier"],
    ["title", "Event Title"],
    ["start", "timestamp"],
    ["a", "34550:pubkey:tribe-dTag"]  // References tribe
  ]
}
```

**Legacy Support:**
- Fully supported for backward compatibility
- Queried alongside enhanced events
- No event type classification

## Maintenance

### Adding New Event Types
1. Update `EVENT_TYPES` array in useEvents.ts
2. Add type info to `getEventTypeInfo` function
3. Update CreateEventDialog type selection

### Performance Considerations
- Multiple query strategies increase reliability
- Client-side filtering used as fallback
- Cache invalidation ensures fresh data

### Future Enhancements
- Automatic tribe tag format detection
- Event migration tools for format changes
- Performance metrics for query strategies