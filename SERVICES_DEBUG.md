# Services Feature Debugging Guide

## Issues Fixed

### 1. ✅ Select Component Error
**Problem**: `A <Select.Item /> must have a value prop that is not an empty string`
**Solution**: Changed empty string values to `"any"` and handle conversion in `onValueChange`

### 2. ✅ Services Not Publishing
**Problem**: Services created but not appearing in lists
**Solution**: Implemented proper Nostr publishing using `useNostrPublish` hook

### 3. ✅ Services Not Appearing Despite Being Published
**Problem**: Debug shows services exist "by author" but not "by tribe"
**Root Cause**: Tribe tag mismatch - services created with wrong tribe identifier
**Solution**: Added fallback query logic to handle both formats and fixed tribe tag creation

## Debugging Steps

### 1. Check Service Creation
When you create a service, check the browser console for:
- Service creation logs
- Publishing success/error messages
- Event data structure

### 2. Use Debug Component
The Services tab now includes a debug component that shows:
- Current query results
- Event validation status
- Relay connectivity
- Diagnostic information

To use it:
1. Go to any tribe's Services tab
2. Click "Service Debug Info" to expand
3. Click "Run Diagnostics" to test queries
4. Check the results for issues

### 3. Common Issues

**Services not appearing:**
- Check if you're on the correct tribe
- Verify the tribe ID format (should be `pubkey:d-tag`)
- Check if events are being published to the relay
- Use debug component to test different queries
- **If debug shows "Services by Author" but not "All Services"**: This indicates a tribe tag mismatch. The fix has been implemented with fallback queries, but you may need to create new services.

**Publishing failures:**
- Ensure user is logged in with a valid signer
- Check relay connectivity
- Verify event structure in console logs

**Filter errors:**
- All Select components now use proper non-empty values
- Distance and time filters should work correctly

### 4. Manual Testing

To test service creation:
1. Log in with a Nostr account
2. Go to a tribe's Services tab
3. Click "Create Offer" or "Create Request"
4. Fill out the form completely
5. Submit and check debug info

### 5. Event Structure

Services use these custom event kinds:
- **38857**: Service Offers
- **30627**: Service Requests
- **34871**: Service Matches

Required tags:
- `d`: Unique identifier
- `tribe`: Tribe d-tag
- `t`: Category (yardwork, pets, eldercare, errands, oddjobs)
- `l`: Location as "lat,lon"

## Validation

The system includes comprehensive validation:
- Content length (≤140 characters)
- Required tags presence
- Valid category values
- Proper location format
- Event kind correctness

## Next Steps

If services still don't appear:
1. Check the debug component output
2. Verify relay is receiving events
3. Ensure proper tribe membership
4. Test with different relays
5. Check browser console for errors