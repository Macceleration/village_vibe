# Tribe Events and Services Extension

## Summary

This document defines custom event kinds used by the Tribe app to extend existing Nostr NIPs for community-based event management with attendance verification and local services marketplace.

## Custom Event Kinds

### Kind 2073: Attendance Verification

An attendance verification event is used to prove physical presence at a tribe event. These events are generated when a user successfully scans a 13-digit QR code provided by the event host and enters the code in their Nostr client.

#### Tags

- `a` (required): Coordinates to the calendar event being attended (kind 31923)
- `e` (optional): Event ID of the specific calendar event revision
- `p` (required): Pubkey of the event host who generated the verification code
- `nonce` (required): 13-digit verification code from the QR scan (format: 10-digit timestamp + 3-digit random)
- `location` (optional): Location where verification occurred
- `verified_at` (required): Unix timestamp when verification occurred

#### Example

```json
{
  "kind": 2073,
  "content": "Verified attendance at Vibe Coders Meetup #3",
  "tags": [
    ["a", "31923:host-pubkey:meetup-3", "wss://relay.example.com"],
    ["e", "event-id-hex"],
    ["p", "host-pubkey-hex"],
    ["nonce", "1693526400123"],
    ["location", "Tech Hub Downtown"],
    ["verified_at", "1693526400"],
    ["alt", "Attendance verification for tribe event"]
  ]
}
```

### Kind 9022: Join Request Rejection

A join request rejection event is used to track when tribe administrators reject join requests. This prevents duplicate requests and provides a rejection history.

#### Tags

- `h` (required): Group identifier (tribe coordinates: pubkey:d-tag)
- `p` (required): Pubkey of the rejected user
- `e` (required): Event ID of the original join request being rejected

#### Example

```json
{
  "kind": 9022,
  "content": "Join request rejected for tribe tribe-id",
  "tags": [
    ["h", "tribe-pubkey:tribe-d-tag"],
    ["p", "rejected-user-pubkey"],
    ["e", "original-request-event-id"],
    ["alt", "Join request rejection for tribe membership"]
  ]
}
```

### Kind 38857: Service Offer

A service offer event represents someone offering to provide a service to their tribe or village community. These are addressable events that can be updated by the author.

#### Tags

- `d` (required): Unique identifier for this service offer
- `tribe` (required): Tribe slug this service is offered within
- `village` (optional, repeatable): Village slug(s) where service is available
- `t` (required): Service category (yardwork, pets, eldercare, errands, oddjobs)
- `l` (required): Approximate location as "lat,lon" (rounded for privacy)
- `area` (optional): Human-readable area description
- `avail` (optional): Availability description (e.g., "weekends,evenings")
- `rate` (optional): Rate description (e.g., "zap-what-you-want", "$20/hr")
- `radius` (optional): Service radius (e.g., "0.5mi")
- `contact` (optional): Alternative contact method (npub)
- `expires` (optional): Unix timestamp when offer expires

#### Content

Short description of the service being offered (≤140 characters).

#### Example

```json
{
  "kind": 38857,
  "content": "Terrence — mow, rake, snow. Evenings + weekends.",
  "tags": [
    ["d", "offer-terrence-0001"],
    ["tribe", "mack-garden-club"],
    ["village", "mack-eastside"],
    ["t", "yardwork"],
    ["l", "42.3810,-82.9539"],
    ["area", "Van Dyke & Mack"],
    ["avail", "weekends,evenings"],
    ["rate", "zap-what-you-want"],
    ["radius", "0.7mi"],
    ["alt", "Service offer for local community help"]
  ]
}
```

### Kind 30627: Service Request

A service request event represents someone requesting help with a service from their tribe or village community. These are addressable events that can be updated by the author.

#### Tags

- `d` (required): Unique identifier for this service request
- `tribe` (required): Tribe slug where help is needed
- `village` (optional, repeatable): Village slug(s) where service is needed
- `t` (required): Service category (yardwork, pets, eldercare, errands, oddjobs)
- `l` (required): Approximate location as "lat,lon" (rounded for privacy)
- `area` (optional): Human-readable area description
- `time` (optional): Preferred time window (e.g., "Tue 10-12")
- `rate` (optional): Offered compensation
- `contact` (optional): Alternative contact method (npub)
- `expires` (optional): Unix timestamp when request expires

#### Content

Short description of the help needed (≤140 characters).

#### Example

```json
{
  "kind": 30627,
  "content": "Weekly elder visit; simple tablet help.",
  "tags": [
    ["d", "req-elder-van-dyke-2025w41"],
    ["tribe", "st-marks-church"],
    ["village", "mack-eastside"],
    ["t", "eldercare"],
    ["l", "42.3812,-82.9546"],
    ["time", "Tue 10–11am"],
    ["alt", "Service request for local community help"]
  ]
}
```

### Kind 34871: Service Match

A service match event records when someone responds to a service request or offer, facilitating connections between community members.

#### Tags

- `d` (required): Unique identifier for this match
- `a` (required): Address of the service request being matched
- `a` (required): Address of the service offer being matched (if applicable)
- `by` (required): Pubkey of the person creating the match
- `type` (required): Type of match ("offer_to_request", "request_to_offer", or "admin_suggestion")

#### Content

Optional message or context for the match.

#### Example

```json
{
  "kind": 34871,
  "content": "I can help with this elder visit request",
  "tags": [
    ["d", "match-elder-visit-001"],
    ["a", "30627:req-pubkey:req-elder-van-dyke-2025w41"],
    ["a", "38857:off-pubkey:offer-terrence-0001"],
    ["by", "matcher-pubkey"],
    ["type", "offer_to_request"],
    ["alt", "Service match connecting community members"]
  ]
}
```

#### Admin Suggestions

Tribe administrators can suggest matches between offers and requests:

```json
{
  "kind": 34871,
  "content": "These services seem like a good match based on location and timing",
  "tags": [
    ["d", "admin-match-suggestion-001"],
    ["a", "30627:req-pubkey:req-elder-van-dyke-2025w41"],
    ["a", "38857:off-pubkey:offer-terrence-0001"],
    ["by", "admin-pubkey"],
    ["type", "admin_suggestion"],
    ["alt", "Admin suggestion for service match"]
  ]
}
```

## Service Moderation

Tribe administrators can moderate services using NIP-32 labeling:

### Hiding Services

Administrators can hide inappropriate services by publishing label events:

```json
{
  "kind": 1985,
  "content": "Service hidden due to inappropriate content",
  "tags": [
    ["L", "moderation"],
    ["l", "hidden-by-moderator", "moderation"],
    ["e", "service-event-id"],
    ["p", "service-author-pubkey"],
    ["k", "38857"],
    ["alt", "Moderation action: hide service"]
  ]
}
```

### Removing Services

For stronger moderation actions:

```json
{
  "kind": 1985,
  "content": "Service removed for policy violation",
  "tags": [
    ["L", "moderation"],
    ["l", "removed-by-moderator", "moderation"],
    ["e", "service-event-id"],
    ["p", "service-author-pubkey"],
    ["k", "38857"],
    ["alt", "Moderation action: remove service"]
  ]
}
```

## Integration with Existing NIPs

This custom kind integrates with the following established NIPs:

- **NIP-32**: Labeling for service moderation and trust indicators
- **NIP-52**: Calendar events (kind 31923) for tribe events and RSVP (kind 31925)
- **NIP-58**: Badge system (kinds 8, 30008, 30009) for attendance badges and trust
- **NIP-72**: Moderated communities (kind 34550) for tribe definitions

## Badge Issuance Flow

1. User attends tribe event and scans 13-digit QR code
2. User enters the code in their Nostr client to check-in
3. Attendance verification event (kind 2073) is published
4. Automated badge award event (kind 8) is issued by tribe
5. User can display badge in their profile badges (kind 30008)