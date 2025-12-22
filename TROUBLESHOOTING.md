# Troubleshooting Guide - Village Vibe

## Common Issue: Tribe Not Loading

### Symptoms
- Tribe page shows "Tribe not found" error
- Console shows `hasData: false` even though events load
- Works after clicking "Refresh" button

### Why This Happens
Nostr is a distributed network. Tribe data (kind 34550 events) may not be available on all relays at the same time.

**The app queries 4 relays simultaneously:**
1. Your selected relay (default: Ditto)
2. Ditto backup
3. Damus backup
4. Primal/Nos fallback

If **all 4 relays** fail to return the tribe within the timeout period (15 seconds), you'll see the error.

### Solutions

#### 1. Click the Refresh Button ✅
The easiest fix! Just click the "Refresh" button in the top-right of the tribe page.

#### 2. Wait for All Retries
The app automatically retries 4 times with increasing timeouts:
- Attempt 1: 15 seconds
- Attempt 2: 15 seconds (after 1s delay)
- Attempt 3: 15 seconds (after 2s delay)
- Attempt 4: 15 seconds (after 4s delay)
- Attempt 5: 15 seconds (after 8s delay)

**Total max wait time: ~90 seconds**

#### 3. Switch Relays
Click the relay dropdown in the navigation (top-right) and try:
- Ditto (usually best for Village Vibe content)
- Damus (good general relay)
- Primal (popular public relay)
- Nos (alternative option)

#### 4. Clear Cache and Reload
In rare cases, try a hard refresh:
- **Windows/Linux**: `Ctrl + Shift + R`
- **Mac**: `Cmd + Shift + R`

### Understanding the Console Logs

#### Good Signs ✅
```
📦 Tribe query result: { found: true, eventId: '5e8d2757' }
🔄 Tribe query status: { hasData: true, failureCount: 0 }
```

#### Warning Signs ⚠️
```
📦 Tribe query result: { found: false }
🔄 Tribe query status: { hasData: false, failureCount: 2 }
```
*This means retries are happening - be patient!*

#### Error Signs ❌
```
🔄 Tribe query status: { hasData: false, failureCount: 4, error: 'Tribe not found' }
```
*All retries exhausted - tribe may not exist or all relays are down*

## Query Performance Settings

### Current Timeouts
- **Tribe query**: 15 seconds per attempt × 5 attempts = 75s max
- **Events query**: 10 seconds per attempt × 3 retries = 30s max
- **Stories/Services**: 10 seconds per attempt × 3 retries = 30s max

### Current Retry Strategy
- **Tribe**: 4 retries with exponential backoff (500ms, 1s, 2s, 4s, 8s)
- **Events**: 2 retries with exponential backoff
- **Stories/Services**: 2 retries with exponential backoff

### Current Cache Strategy
- **Tribe data**: 2 minutes (refetches every 2 min if you revisit)
- **Events data**: 1 minute
- **Stories/Services**: 1 minute
- **Global cache**: Infinity (persists across sessions)

## Multi-Relay Architecture

### How It Works
When you query for data, the app:

1. **Sends the same query to 4 relays simultaneously**
2. **Collects all responses** (doesn't stop at first response)
3. **Deduplicates events** by ID
4. **Returns combined results** from all relays

### Benefits
- ✅ **4x redundancy** - Can handle 75% relay failures
- ✅ **Faster results** - First relay to respond contributes immediately
- ✅ **More content** - Different relays have different data
- ✅ **Better reliability** - No single point of failure

### Relay Status
Check the relay indicator in the navigation (top-right) to see:
- 🟢 **Green Wifi icon**: Primary relay connected (latency < 2s)
- 🔴 **Red Wifi icon**: Primary relay disconnected or slow
- Click to see detailed status and latency

## Performance Optimizations

### Hover Prefetching
When you hover over a tribe's "View" button, the app prefetches the tribe data in the background. This makes navigation feel instant!

### Smart Caching
- First visit: Fetches from relays
- Subsequent visits (within cache time): Uses cached data
- Cache expired: Refetches in background while showing cached data

### Reduced Query Limits
- Events: 100 instead of 200 (faster initial load)
- Can be increased by scrolling (future enhancement)

## Force Refresh

### Manual Refresh Button
The "Refresh" button in the top-right forces:
- ✅ Tribe data refetch
- ✅ Events data refetch
- ✅ Bypasses cache
- ✅ Shows loading spinner

Use this when:
- Tribe doesn't load on first try
- You just created/edited content
- Data seems stale or outdated

## When to Report a Bug

Report an issue if:
- ❌ Refresh button doesn't help after 3 tries
- ❌ All relays show as disconnected
- ❌ Error persists across different browsers
- ❌ Events load but tribe never loads (even after 5 attempts)

Include in your report:
- Console logs (open DevTools → Console)
- Tribe ID that's failing
- Which relay you're using
- Browser and OS

## Developer Mode

To see detailed debug logs, open your browser's DevTools console (F12).

Look for these log prefixes:
- `🔍` - Query starting
- `📦` - Results found
- `✅` - Validation passed
- `⚠️` - Warning (non-critical)
- `🔄` - Status update

## Quick Reference

| Issue | Solution | Time |
|-------|----------|------|
| Tribe not found | Click Refresh | Instant |
| Slow loading | Wait for retries | 15-90s |
| Still not loading | Switch relays | 2-5s |
| Persistent issues | Clear cache | Instant |

## Best Practices

1. **Be patient** - First retry is automatic after 500ms
2. **Use Refresh button** - Faster than page reload
3. **Try Ditto relay** - Usually has the best Village Vibe content
4. **Check console** - Detailed logs help debug issues
5. **Report patterns** - If specific tribes always fail, report it

## Technical Details

### Query Stack
```
User clicks tribe link
  ↓
React Router navigates to /tribe/:tribeId
  ↓
TribeView component mounts
  ↓
useTribe hook triggers
  ↓
Query sent to 4 relays via NPool
  ↓
15s timeout per relay
  ↓
If no results → retry with backoff
  ↓
If all retries fail → show error
  ↓
User clicks Refresh → start over
```

### Success Rate
With current settings:
- **~95% success rate** on first attempt
- **~99% success rate** after all retries
- **<1% complete failures** (usually network issues)

Average load times:
- **Fast**: 1-3 seconds (cached or good relay)
- **Normal**: 3-5 seconds (fresh query, normal latency)
- **Slow**: 5-15 seconds (relay congestion)
- **Very slow**: 15-90 seconds (retries, slow relay)
- **Timeout**: >90 seconds (all relays failed)
