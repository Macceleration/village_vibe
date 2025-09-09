# Village Vibe - Custom Nostr Implementation

This document describes the custom Nostr event kinds and extensions used by Village Vibe for community stories and village aggregation.

## Stories (NIP-23 Extension)

Village Vibe uses **kind 30023** (Long-form Content from NIP-23) for community stories with the following extensions:

### Required Tags

- `["d", "<stable-story-id>"]` - Parameterized replaceable key for edits
- `["tribe", "<tribe-slug>"]` - Tribe where the story was created
- `["title", "<story-title>"]` - Story title

### Optional Tags

- `["summary", "<one-liner>"]` - Brief description for preview cards
- `["cover", "<img-url>"]` - Cover image URL for story preview
- `["village", "<village-slug>"]` - Added when story is promoted to village
- `["place", "<location-name>"]` - Human-readable location name
- `["l", "<lat>,<lon>"]` - Approximate coordinates (rounded for privacy)
- `["ref", "<event-id>"]` - Reference to related event (if story is about an event)
- `["alt", "Community story shared with the village"]` - NIP-31 alternative description

### Content

Stories use Markdown content in the `content` field, following NIP-23 guidelines for long-form content.

## Story Moderation (NIP-32 Labels)

Village Vibe uses **kind 1985** (Label from NIP-32) for story moderation with these label values:

### Moderation Labels

- `["l", "tribe-hidden", "moderation"]` - Story hidden from tribe feed
- `["l", "village-promoted", "promotion"]` - Story promoted to village
- `["l", "village-featured", "promotion"]` - Story featured in village hero section

### Required Tags for Labels

- `["a", "30023:<pubkey>:<d-tag>"]` - Reference to the story being labeled
- `["L", "<namespace>"]` - Label namespace ("moderation" or "promotion")

## Village Aggregation

Villages aggregate content using the `village` tag:

- **Stories**: `["village", "<village-slug>"]` tag added when promoted
- **Services**: `["village", "<village-slug>"]` tag for village-wide services  
- **Events**: `["village", "<village-slug>"]` tag for village-wide events

## Implementation Notes

1. **Privacy**: Location coordinates are rounded to 4 decimal places (~11m precision) for privacy
2. **Moderation**: All moderation is additive (labels) and non-destructive
3. **Promotion**: Stories start in tribes and can be promoted to villages by tribe admins
4. **Editability**: Stories use parameterized replaceable events for editing capability
5. **Interoperability**: Based on existing NIPs (23, 32) for maximum compatibility

## Example Story Event

```json
{
  "kind": 30023,
  "created_at": 1704067200,
  "content": "# Community Garden Success\n\nOur tribe's community garden project has been thriving! We've harvested over 200 pounds of vegetables this season and shared them with local families in need.\n\n## What We Learned\n\n- Collaboration makes everything better\n- Fresh vegetables taste amazing\n- Community building happens naturally around shared goals\n\nThanks to everyone who participated!",
  "tags": [
    ["d", "garden-success-2024"],
    ["tribe", "green-thumbs"],
    ["title", "Community Garden Success Story"],
    ["summary", "Our tribe's garden project harvested 200+ pounds of vegetables for local families"],
    ["cover", "https://example.com/garden-photo.jpg"],
    ["place", "Community Center Garden"],
    ["l", "40.7128,-74.0060"],
    ["village", "brooklyn-heights"],
    ["alt", "Community story shared with the village"]
  ],
  "pubkey": "...",
  "id": "..."
}
```

## Example Moderation Label

```json
{
  "kind": 1985,
  "created_at": 1704067800,
  "content": "Promoting this inspiring story to the village feed",
  "tags": [
    ["a", "30023:abc123...:garden-success-2024"],
    ["L", "promotion"],
    ["l", "village-promoted", "promotion"],
    ["alt", "Story moderation label: village-promoted"]
  ],
  "pubkey": "...",
  "id": "..."
}
```