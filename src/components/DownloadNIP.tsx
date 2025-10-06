import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export function DownloadNIP() {
  const handleDownload = () => {
    // Get the NIP content
    const nipContent = `# Village Vibe - Custom Nostr Implementation

This document describes the custom Nostr event kinds and extensions used by Village Vibe for community stories, events, services, and village aggregation.

## Stories (NIP-23 Extension)

Village Vibe uses **kind 30023** (Long-form Content from NIP-23) for community stories with the following extensions:

### Required Tags

- \`["d", "<stable-story-id>"]\` - Parameterized replaceable key for edits
- \`["tribe", "<tribe-slug>"]\` - Tribe where the story was created
- \`["title", "<story-title>"]\` - Story title

### Optional Tags

- \`["summary", "<one-liner>"]\` - Brief description for preview cards
- \`["cover", "<img-url>"]\` - Cover image URL for story preview
- \`["village", "<village-slug>"]\` - Added when story is promoted to village
- \`["place", "<location-name>"]\` - Human-readable location name
- \`["l", "<lat>,<lon>"]\` - Approximate coordinates (rounded for privacy)
- \`["ref", "<event-id>"]\` - Reference to related event (if story is about an event)
- \`["alt", "Community story shared with the village"]\` - NIP-31 alternative description

### Content

Stories use Markdown content in the \`content\` field, following NIP-23 guidelines for long-form content.

## Story Moderation (NIP-32 Labels)

Village Vibe uses **kind 1985** (Label from NIP-32) for story moderation with these label values:

### Moderation Labels

- \`["l", "tribe-hidden", "moderation"]\` - Story hidden from tribe feed
- \`["l", "village-promoted", "promotion"]\` - Story promoted to village
- \`["l", "village-featured", "promotion"]\` - Story featured in village hero section

### Required Tags for Labels

- \`["a", "30023:<pubkey>:<d-tag>"]\` - Reference to the story being labeled
- \`["L", "<namespace>"]\` - Label namespace ("moderation" or "promotion")

## Village Aggregation

Villages aggregate content using the \`village\` tag:

- **Stories**: \`["village", "<village-slug>"]\` tag added when promoted
- **Services**: \`["village", "<village-slug>"]\` tag for village-wide services
- **Events**: \`["village", "<village-slug>"]\` tag for village-wide events

## Enhanced Events (Custom Kind 36959)

Village Vibe uses **kind 36959** (addressable events) for enhanced community events with multi-type support and private event capabilities.

### Required Tags

- \`["d", "<stable-event-id>"]\` - Parameterized replaceable key for edits
- \`["tribe", "<tribe-slug>"]\` - Tribe where the event was created
- \`["title", "<event-title>"]\` - Event title
- \`["start", "<unix-timestamp>"]\` - Event start time (Unix timestamp)
- \`["place", "<location-name>"]\` - Human-readable location name
- \`["l", "<lat>,<lon>"]\` - Approximate coordinates (rounded for privacy)

### Event Type Tags (Multi-select, Additive)

Events can carry multiple types stored and indexed via tags. Whitelisted values:

- \`["etype", "meetup"]\` - General meetup
- \`["etype", "gathering"]\` - General gathering
- \`["etype", "potluck"]\` - Community potluck
- \`["etype", "trivia"]\` - Trivia night
- \`["etype", "game"]\` - Game night
- \`["etype", "service-day"]\` - Community service day
- \`["etype", "cleanup"]\` - Cleanup activity
- \`["etype", "workshop"]\` - Workshop
- \`["etype", "skill-swap"]\` - Skill sharing/swap
- \`["etype", "celebration"]\` - Celebration
- \`["etype", "ritual"]\` - Ritual or ceremony
- \`["etype", "market"]\` - Market
- \`["etype", "swap"]\` - Swap meet
- \`["etype", "freebie-fair"]\` - Freebie fair
- \`["etype", "mixer"]\` - Social mixer
- \`["etype", "matchmaking"]\` - Matchmaking event
- \`["etype", "council"]\` - Council meeting
- \`["etype", "tribe-meeting"]\` - Tribe meeting

**Multi-type Support**: Events can include multiple \`etype\` tags for combined event types (e.g., a potluck + cleanup event would have both \`["etype", "potluck"]\` and \`["etype", "cleanup"]\` tags).

### Optional Tags

- \`["end", "<unix-timestamp>"]\` - Event end time
- \`["summary", "<brief-description>"]\` - Brief description for preview cards
- \`["village", "<village-slug>"]\` - Added when event is promoted to village
- \`["visibility", "public|tribe-only|private"]\` - Event visibility level
- \`["p", "<invitee-pubkey>"]\` - Invitees for private events (repeated)
- \`["alt", "Community event for local participation"]\` - NIP-31 alternative description

### Type-Specific Enhancement Tags

**Potluck Events:**
- \`["food", "main|side|dessert|drinks"]\` - Food contribution slots (multiple allowed)
- \`["diet_notes", "<notes>"]\` - Dietary restrictions/notes

**Service-Day/Cleanup Events:**
- \`["task", "trash-pickup|tree-planting|paint"]\` - Available tasks (multiple allowed)
- \`["tools_needed", "<tool-list>"]\` - Required tools and equipment

**Workshop/Skill-Swap Events:**
- \`["instructors", "<name-or-npub>"]\` - Workshop instructors (multiple allowed)
- \`["materials", "<material-list>"]\` - Required materials

**Trivia/Game Events:**
- \`["game_kind", "<game-type>"]\` - Type of game (e.g., trivia, board games)
- \`["teams_mode", "auto|custom"]\` - Team assignment method

**Celebration/Ritual Events:**
- \`["occasion", "<occasion-type>"]\` - Celebration type (e.g., birthday, harvest, holiday)

### Content

Events use a short description (≤500 chars) in the \`content\` field. Longer details should be in linked NIP-23 stories or sent via DMs for private events.

## Private Events

Private events use the same kind 36959 but with specific handling:

1. **Event Shell**: Published with minimal public info and \`["visibility", "private"]\`
2. **Invitee List**: Include \`["p", "<invitee-pubkey>"]\` tags for each invitee
3. **Private Details**: Full details (exact address, instructions) sent via NIP-04 DMs to invitees
4. **Visibility**: Only visible to organizer, invitees, and tribe admins

## Event Moderation (NIP-32 Labels)

Enhanced events use **kind 1985** labels for moderation:

### Event Labels

- \`["l", "tribe-hidden", "moderation"]\` - Event hidden from tribe feed
- \`["l", "village-promoted", "promotion"]\` - Event promoted to village
- \`["l", "village-featured", "promotion"]\` - Event featured in village hero section
- \`["l", "private-meta", "moderation"]\` - Marks private event metadata for filtering

### Required Tags for Event Labels

- \`["a", "36959:<pubkey>:<d-tag>"]\` - Reference to the event being labeled
- \`["L", "<namespace>"]\` - Label namespace ("moderation" or "promotion")

## Event Type Filtering

Events can be filtered by one or multiple types using the \`etype\` parameter:

- Single type: \`?etype=potluck\`
- Multiple types: \`?etype=potluck,service-day,workshop\`

Filtering is additive - events matching any of the specified types will be returned.

## Implementation Notes

1. **Privacy**: Location coordinates are rounded to 4 decimal places (~11m precision) for privacy
2. **Moderation**: All moderation is additive (labels) and non-destructive
3. **Promotion**: Events start in tribes and can be promoted to villages by tribe admins
4. **Editability**: Events use parameterized replaceable events for editing capability
5. **Multi-Type**: Events can have multiple \`etype\` tags for combined event types
6. **Private Events**: Use DMs for sensitive details, event shell remains public with minimal info
7. **Interoperability**: Based on existing NIPs (52, 23, 32, 04) for maximum compatibility

## Example Enhanced Event

\`\`\`json
{
  "kind": 36959,
  "created_at": 1704067200,
  "content": "Join us for our monthly community potluck and garden cleanup! Bring a dish to share and help us maintain our beautiful community garden space.",
  "tags": [
    ["d", "potluck-cleanup-2024-01"],
    ["tribe", "green-thumbs"],
    ["title", "Community Potluck & Garden Cleanup"],
    ["start", "1704124800"],
    ["end", "1704135600"],
    ["place", "Community Center Garden"],
    ["l", "40.7128,-74.0060"],
    ["etype", "potluck"],
    ["etype", "cleanup"],
    ["food", "main"],
    ["food", "side"],
    ["food", "dessert"],
    ["diet_notes", "vegetarian options available"],
    ["task", "weeding"],
    ["task", "composting"],
    ["tools_needed", "gloves, rakes, compost bins"],
    ["village", "brooklyn-heights"],
    ["visibility", "public"],
    ["alt", "Community event for local participation"]
  ],
  "pubkey": "...",
  "id": "..."
}
\`\`\`

## Example Private Event

\`\`\`json
{
  "kind": 36959,
  "created_at": 1704067200,
  "content": "Small gathering for tribe members. Details will be shared privately.",
  "tags": [
    ["d", "private-gathering-2024-01"],
    ["tribe", "green-thumbs"],
    ["title", "Private Tribe Gathering"],
    ["start", "1704124800"],
    ["place", "Private Location"],
    ["l", "40.7100,-74.0050"],
    ["etype", "meetup"],
    ["visibility", "private"],
    ["p", "abc123..."],
    ["p", "def456..."],
    ["alt", "Private community event"]
  ],
  "pubkey": "...",
  "id": "..."
}
\`\`\`

## Example Story Event

\`\`\`json
{
  "kind": 30023,
  "created_at": 1704067200,
  "content": "# Community Garden Success\\n\\nOur tribe's community garden project has been thriving! We've harvested over 200 pounds of vegetables this season and shared them with local families in need.\\n\\n## What We Learned\\n\\n- Collaboration makes everything better\\n- Fresh vegetables taste amazing\\n- Community building happens naturally around shared goals\\n\\nThanks to everyone who participated!",
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
\`\`\`

## Example Moderation Label

\`\`\`json
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
\`\`\``;

    // Create blob and download
    const blob = new Blob([nipContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'village-vibe-nip.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Button onClick={handleDownload} variant="outline" className="gap-2">
      <Download className="h-4 w-4" />
      Download NIP Document
    </Button>
  );
}