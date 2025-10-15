# Event Coordination System

## Overview

Village Vibe's flexible event coordination system allows any type of gathering (cleanup, feast, workshop, fundraiser, meetup) to coordinate people, stuff, and tasks using a single unified structure.

## Core Primitives

Every event can mix and match these sub-objects:

### 1. **Roles** → People responsibilities or shifts
- Define volunteer positions and shifts
- Set number of slots needed
- Track who's filled each role
- Optional time windows for shifts
- Skill requirements

### 2. **Items** → Physical or digital resources
- Things to bring or provide
- Quantity tracking
- Categories (food, tools, supplies)
- Unit specifications (servings, pieces, hours)

### 3. **Actions** → Discrete tasks or milestones
- To-do items and milestones
- Assignable to specific people
- Due dates and priorities
- Dependency tracking
- Status updates (pending, in-progress, done, blocked)

### 4. **Outcomes** → Metrics or stories that record results
- Post-event metrics (attendance, food collected, trash picked up)
- Success stories
- Photo documentation
- Feedback collection

### 5. **Alerts** → Timed or conditional notifications
- Reminders (24h before event, etc.)
- Gap warnings (unfilled roles, missing items)
- Milestone notifications
- Custom triggers

## Nostr Implementation

Each coordination object is a separate Nostr event that references the parent event:

### Event Kinds

```typescript
const COORDINATION_KINDS = {
  ROLE: 38401,          // Event role definition
  ROLE_CLAIM: 38402,    // Role claim by user
  ITEM: 38403,          // Event item/resource
  ITEM_CLAIM: 38404,    // Item claim by user
  ACTION: 38405,        // Event action/task
  ACTION_UPDATE: 38406, // Action status update
  OUTCOME: 38407,       // Event outcome record
  ALERT_RULE: 38408,    // Alert rule definition
  ALERT_TRIGGER: 38409, // Alert trigger notification
};
```

### Interoperability

All objects include an `external_ref` field to link with external systems:
- Cooking with Grace recipes
- Nostr addresses
- Other sub-apps

The RSVP system (kind 31925) remains unchanged for backward compatibility.

## UI Structure

### Public Event Page

Tabs for each coordination type:
- **Overview**: Summary dashboard with gap indicators
- **Roles**: Browse and claim volunteer positions
- **Items**: See what's needed and claim items to bring
- **Tasks**: View action items and progress
- **Outcomes**: See results and impact after the event

### Organizer Console

Enhanced management interface:
- **Dashboard**: At-a-glance status with gap alerts
- **Rosters**: Who's signed up for what
- **Logistics**: Items tracking and coordination
- **Tasks**: Action items and dependencies
- **Alerts**: Configure reminders and notifications

## Status Tracking

### Role Statuses
- `open`: Available for claiming
- `claimed`: Someone signed up
- `filled`: All slots full
- `canceled`: Role no longer needed

### Item Statuses
- `needed`: Not yet claimed
- `claimed`: Someone committed
- `confirmed`: Organizer verified
- `canceled`: No longer needed

### Action Statuses
- `pending`: Not started
- `in-progress`: Being worked on
- `done`: Completed
- `blocked`: Waiting on something
- `canceled`: No longer needed

## Example Event Types

### Community Cleanup
- **Roles**: Site coordinator, safety monitor, photographer
- **Items**: Trash bags, gloves, first aid kit
- **Actions**: Reserve dumpster, buy supplies, post event
- **Outcomes**: Pounds of trash collected, before/after photos

### Potluck Dinner
- **Roles**: Setup crew, cleanup crew, greeter
- **Items**: Main dishes, sides, desserts, drinks
- **Actions**: Send invites, set up tables, coordinate dishes
- **Outcomes**: Attendance count, favorite dishes, group photo

### Workshop
- **Roles**: Instructor, assistant, note-taker
- **Items**: Materials, tools, handouts
- **Actions**: Prepare slides, test equipment, print materials
- **Outcomes**: Skills learned, participant feedback, resources shared

### Fundraiser
- **Roles**: Registration, donations table, auctioneer
- **Items**: Auction items, promotional materials, receipt books
- **Actions**: Get permits, recruit donors, market event
- **Outcomes**: Funds raised, donors acquired, impact metrics

## Implementation Status

### ✅ Completed
- Core data models and types
- Nostr event structures
- React hooks for CRUD operations
- Query hooks for fetching coordination data
- Aggregation/summary hooks
- Tab navigation structure

### 🚧 In Progress
- UI components for each tab
- Create/edit dialogs
- Claim/unclaim flows
- Organizer console
- Gap indicators

### 📋 Pending
- Alert rules engine
- Notification scheduler
- Email/SMS/push integration
- External reference system
- Demo event seeding
- Mobile optimization

## API Surface

### Hooks

```typescript
// Roles
useEventRoles(eventId) 
useCreateRole()
useClaimRole()
useRoleClaims(roleId)

// Items
useEventItems(eventId)
useCreateItem()
useClaimItem()
useItemClaims(itemId)

// Actions
useEventActions(eventId)
useCreateAction()
useUpdateAction()

// Outcomes
useEventOutcomes(eventId)
useCreateOutcome()

// Summary
useEventCoordinationSummary(eventId)
```

### Publishing

All creation hooks return `{ eventData }` which must be published using `useNostrPublish`:

```typescript
const { mutate: createRole } = useCreateRole();
const { mutateAsync: publish } = useNostrPublish();

createRole({...}, {
  onSuccess: async (result) => {
    await publish(result.eventData);
  }
});
```

## Design Principles

1. **Composable**: Mix and match primitives for any event type
2. **Decentralized**: All data in Nostr events, no central database
3. **Interoperable**: External references for linking with other apps
4. **Progressive**: Start simple, add coordination as needed
5. **Accessible**: Mobile-first, keyboard navigation, screen reader support
6. **Resilient**: Works offline, syncs when reconnected

## Next Steps

1. Complete remaining UI components
2. Add organizer console
3. Implement alert rules
4. Create demo events
5. User testing with real community events
6. Integration with Cooking with Grace
7. Mobile app considerations
