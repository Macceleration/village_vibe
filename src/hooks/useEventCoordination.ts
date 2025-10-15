import { useNostr } from '@nostrify/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { NostrEvent } from '@nostrify/nostrify';
import { useCurrentUser } from './useCurrentUser';

/**
 * Event Coordination System
 *
 * This module provides a flexible system for coordinating people, stuff, and tasks
 * for any type of event using composable sub-objects:
 *
 * - Roles: People responsibilities or shifts
 * - Items: Physical or digital resources to bring/provide
 * - Actions: Discrete tasks or milestones to complete
 * - Outcomes: Metrics or stories that record results
 * - Alerts: Timed or conditional notifications
 */

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

export const ROLE_STATUSES = ['open', 'claimed', 'filled', 'canceled'] as const;
export type RoleStatus = typeof ROLE_STATUSES[number];

export const ITEM_STATUSES = ['needed', 'claimed', 'confirmed', 'canceled'] as const;
export type ItemStatus = typeof ITEM_STATUSES[number];

export const ACTION_STATUSES = ['pending', 'in-progress', 'done', 'blocked', 'canceled'] as const;
export type ActionStatus = typeof ACTION_STATUSES[number];

export const OUTCOME_TYPES = ['metric', 'story', 'photo', 'feedback'] as const;
export type OutcomeType = typeof OUTCOME_TYPES[number];

export const ALERT_TYPES = ['reminder', 'gap', 'milestone', 'custom'] as const;
export type AlertType = typeof ALERT_TYPES[number];

// Nostr event kinds for coordination objects
export const COORDINATION_KINDS = {
  ROLE: 38401,          // Event role definition
  ROLE_CLAIM: 38402,    // Role claim by user
  ITEM: 38403,          // Event item/resource
  ITEM_CLAIM: 38404,    // Item claim by user
  ACTION: 38405,        // Event action/task
  ACTION_UPDATE: 38406, // Action status update
  OUTCOME: 38407,       // Event outcome record
  ALERT_RULE: 38408,    // Alert rule definition
  ALERT_TRIGGER: 38409, // Alert trigger notification
} as const;

// ============================================================================
// ROLES
// ============================================================================

export interface EventRole {
  id: string;
  eventId: string;
  title: string;
  description: string;
  slots: number;          // How many people needed
  filled: number;         // How many slots filled
  status: RoleStatus;
  timeStart?: number;     // Unix timestamp for shift start
  timeEnd?: number;       // Unix timestamp for shift end
  requirements?: string;  // Special requirements/skills
  externalRef?: string;   // Reference ID for external systems
  createdAt: number;
  createdBy: string;
}

export interface RoleClaim {
  id: string;
  roleId: string;
  eventId: string;
  claimedBy: string;
  claimedAt: number;
  status: 'active' | 'withdrawn';
  notes?: string;
}

// Create a role for an event
export function useCreateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      eventId: string;
      eventKind: number;
      eventAuthor: string;
      eventDTag: string;
      title: string;
      description: string;
      slots: number;
      timeStart?: number;
      timeEnd?: number;
      requirements?: string;
      externalRef?: string;
    }) => {
      const roleId = `role-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const tags: string[][] = [
        ['d', roleId],
        ['a', `${data.eventKind}:${data.eventAuthor}:${data.eventDTag}`],
        ['e', data.eventId, '', 'root'],
        ['title', data.title],
        ['slots', data.slots.toString()],
        ['status', 'open'],
        ['alt', `Event role: ${data.title}`],
      ];

      if (data.timeStart) tags.push(['time_start', data.timeStart.toString()]);
      if (data.timeEnd) tags.push(['time_end', data.timeEnd.toString()]);
      if (data.requirements) tags.push(['requirements', data.requirements]);
      if (data.externalRef) tags.push(['external_ref', data.externalRef]);

      const eventData = {
        kind: COORDINATION_KINDS.ROLE,
        content: data.description,
        tags,
        created_at: Math.floor(Date.now() / 1000),
      };

      return { eventData, roleId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['event-roles', variables.eventId],
      });
    },
  });
}

// Get all roles for an event with claim counts
export function useEventRoles(eventId: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['event-roles', eventId],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(2000)]);

      console.log('🔍 Querying roles for event:', eventId);

      // Get all roles
      const roleEvents = await nostr.query([
        {
          kinds: [COORDINATION_KINDS.ROLE],
          '#e': [eventId],
          limit: 100,
        }
      ], { signal });

      console.log('📦 Found roles:', roleEvents.length);

      // Get all role claims for this event
      const claimEvents = await nostr.query([
        {
          kinds: [COORDINATION_KINDS.ROLE_CLAIM],
          '#e': [eventId],
          limit: 200,
        }
      ], { signal });

      console.log('📦 Found role claims:', claimEvents.length);

      const claims = claimEvents.map(parseRoleClaimEvent).filter((c): c is RoleClaim => c !== null);
      const activeClaims = claims.filter(c => c.status === 'active');

      console.log('✅ Active claims:', activeClaims.length);

      // Count claims per role
      const claimCounts = new Map<string, number>();
      activeClaims.forEach(claim => {
        const count = claimCounts.get(claim.roleId) || 0;
        claimCounts.set(claim.roleId, count + 1);
      });

      // Parse roles and add claim counts
      const roles = roleEvents.map(event => {
        const role = parseRoleEvent(event);
        if (!role) return null;

        const filled = claimCounts.get(role.id) || 0;
        return { ...role, filled };
      }).filter((r): r is EventRole => r !== null);

      console.log('✅ Roles with claim counts:', roles.map(r => ({
        id: r.id,
        title: r.title,
        filled: r.filled,
        slots: r.slots
      })));

      return roles;
    },
  });
}

// Claim a role
export function useClaimRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      roleId: string;
      roleEventId: string;
      eventId: string;
      notes?: string;
    }) => {
      const claimId = `claim-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const tags: string[][] = [
        ['d', claimId],
        ['e', data.roleEventId, '', 'reply'],
        ['e', data.eventId, '', 'root'],
        ['role', data.roleId],
        ['status', 'active'],
        ['alt', 'Event role claim'],
      ];

      if (data.notes) tags.push(['notes', data.notes]);

      const eventData = {
        kind: COORDINATION_KINDS.ROLE_CLAIM,
        content: data.notes || '',
        tags,
        created_at: Math.floor(Date.now() / 1000),
      };

      return { eventData, claimId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['event-roles', variables.eventId],
      });
      queryClient.invalidateQueries({
        queryKey: ['role-claims', variables.roleId],
      });
    },
  });
}

// Get claims for a role
export function useRoleClaims(roleId: string, eventId: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['role-claims', roleId, eventId],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(2000)]);

      console.log('🔍 Querying role claims for:', { roleId, eventId });

      // Query all claims for this event, then filter client-side
      // (Relay doesn't index custom tags like 'role')
      const events = await nostr.query([
        {
          kinds: [COORDINATION_KINDS.ROLE_CLAIM],
          '#e': [eventId], // Query by event ID
          limit: 100,
        }
      ], { signal });

      console.log('📦 Total role claims for event:', events.length);

      // Filter for claims matching this specific role
      const roleClaims = events.filter(event => {
        const claimRoleId = event.tags.find(([n]) => n === 'role')?.[1];
        return claimRoleId === roleId;
      });

      console.log('📦 Claims for this role:', roleClaims.length);

      const parsed = roleClaims.map(parseRoleClaimEvent).filter((c): c is RoleClaim => c !== null);
      console.log('✅ Valid claims:', parsed);

      return parsed;
    },
  });
}

// ============================================================================
// ITEMS
// ============================================================================

export interface EventItem {
  id: string;
  eventId: string;
  title: string;
  description: string;
  quantity: number;
  claimed: number;
  status: ItemStatus;
  category?: string;      // e.g., "food", "tools", "supplies"
  unit?: string;          // e.g., "servings", "pieces", "hours"
  externalRef?: string;
  createdAt: number;
  createdBy: string;
}

export interface ItemClaim {
  id: string;
  itemId: string;
  eventId: string;
  claimedBy: string;
  quantity: number;
  claimedAt: number;
  status: 'active' | 'withdrawn';
  notes?: string;
}

// Create an item for an event
export function useCreateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      eventId: string;
      eventKind: number;
      eventAuthor: string;
      eventDTag: string;
      title: string;
      description: string;
      quantity: number;
      category?: string;
      unit?: string;
      externalRef?: string;
    }) => {
      const itemId = `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const tags: string[][] = [
        ['d', itemId],
        ['a', `${data.eventKind}:${data.eventAuthor}:${data.eventDTag}`],
        ['e', data.eventId, '', 'root'],
        ['title', data.title],
        ['quantity', data.quantity.toString()],
        ['status', 'needed'],
        ['alt', `Event item: ${data.title}`],
      ];

      if (data.category) tags.push(['category', data.category]);
      if (data.unit) tags.push(['unit', data.unit]);
      if (data.externalRef) tags.push(['external_ref', data.externalRef]);

      const eventData = {
        kind: COORDINATION_KINDS.ITEM,
        content: data.description,
        tags,
        created_at: Math.floor(Date.now() / 1000),
      };

      return { eventData, itemId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['event-items', variables.eventId],
      });
    },
  });
}

// Get all items for an event with claim counts
export function useEventItems(eventId: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['event-items', eventId],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(2000)]);

      console.log('🔍 Querying items for event:', eventId);

      // Get all items
      const itemEvents = await nostr.query([
        {
          kinds: [COORDINATION_KINDS.ITEM],
          '#e': [eventId],
          limit: 100,
        }
      ], { signal });

      console.log('📦 Found items:', itemEvents.length);

      // Get all item claims for this event
      const claimEvents = await nostr.query([
        {
          kinds: [COORDINATION_KINDS.ITEM_CLAIM],
          '#e': [eventId],
          limit: 200,
        }
      ], { signal });

      console.log('📦 Found item claims:', claimEvents.length);

      const claims = claimEvents.map(parseItemClaimEvent).filter((c): c is ItemClaim => c !== null);
      const activeClaims = claims.filter(c => c.status === 'active');

      console.log('✅ Active item claims:', activeClaims.length);

      // Count claimed quantities per item
      const claimQuantities = new Map<string, number>();
      activeClaims.forEach(claim => {
        const qty = claimQuantities.get(claim.itemId) || 0;
        claimQuantities.set(claim.itemId, qty + claim.quantity);
      });

      // Parse items and add claim counts
      const items = itemEvents.map(event => {
        const item = parseItemEvent(event);
        if (!item) return null;

        const claimed = claimQuantities.get(item.id) || 0;
        return { ...item, claimed };
      }).filter((i): i is EventItem => i !== null);

      console.log('✅ Items with claim counts:', items.map(i => ({
        id: i.id,
        title: i.title,
        claimed: i.claimed,
        quantity: i.quantity
      })));

      return items;
    },
  });
}

// Claim an item
export function useClaimItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      itemId: string;
      itemEventId: string;
      eventId: string;
      quantity: number;
      notes?: string;
    }) => {
      const claimId = `claim-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const tags: string[][] = [
        ['d', claimId],
        ['e', data.itemEventId, '', 'reply'],
        ['e', data.eventId, '', 'root'],
        ['item', data.itemId],
        ['quantity', data.quantity.toString()],
        ['status', 'active'],
        ['alt', 'Event item claim'],
      ];

      if (data.notes) tags.push(['notes', data.notes]);

      const eventData = {
        kind: COORDINATION_KINDS.ITEM_CLAIM,
        content: data.notes || '',
        tags,
        created_at: Math.floor(Date.now() / 1000),
      };

      return { eventData, claimId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['event-items', variables.eventId],
      });
      queryClient.invalidateQueries({
        queryKey: ['item-claims', variables.itemId],
      });
    },
  });
}

// Get claims for an item
export function useItemClaims(itemId: string, eventId: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['item-claims', itemId, eventId],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(2000)]);

      console.log('🔍 Querying item claims for:', { itemId, eventId });

      // Query all claims for this event, then filter client-side
      // (Relay doesn't index custom tags like 'item')
      const events = await nostr.query([
        {
          kinds: [COORDINATION_KINDS.ITEM_CLAIM],
          '#e': [eventId], // Query by event ID
          limit: 100,
        }
      ], { signal });

      console.log('📦 Total item claims for event:', events.length);

      // Filter for claims matching this specific item
      const itemClaims = events.filter(event => {
        const claimItemId = event.tags.find(([n]) => n === 'item')?.[1];
        return claimItemId === itemId;
      });

      console.log('📦 Claims for this item:', itemClaims.length);

      return itemClaims.map(parseItemClaimEvent).filter((c): c is ItemClaim => c !== null);
    },
  });
}

// ============================================================================
// ACTIONS
// ============================================================================

export interface EventAction {
  id: string;
  eventId: string;
  title: string;
  description: string;
  status: ActionStatus;
  assignedTo?: string;
  dueDate?: number;
  completedAt?: number;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  dependencies?: string[]; // Other action IDs that must complete first
  externalRef?: string;
  createdAt: number;
  createdBy: string;
}

export interface ActionUpdate {
  id: string;
  actionId: string;
  eventId: string;
  status: ActionStatus;
  updatedBy: string;
  updatedAt: number;
  notes?: string;
}

// Create an action for an event
export function useCreateAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      eventId: string;
      eventKind: number;
      eventAuthor: string;
      eventDTag: string;
      title: string;
      description: string;
      assignedTo?: string;
      dueDate?: number;
      priority?: 'low' | 'medium' | 'high' | 'urgent';
      dependencies?: string[];
      externalRef?: string;
    }) => {
      const actionId = `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const tags: string[][] = [
        ['d', actionId],
        ['a', `${data.eventKind}:${data.eventAuthor}:${data.eventDTag}`],
        ['e', data.eventId, '', 'root'],
        ['title', data.title],
        ['status', 'pending'],
        ['alt', `Event action: ${data.title}`],
      ];

      if (data.assignedTo) tags.push(['p', data.assignedTo, '', 'assigned']);
      if (data.dueDate) tags.push(['due_date', data.dueDate.toString()]);
      if (data.priority) tags.push(['priority', data.priority]);
      if (data.dependencies) {
        data.dependencies.forEach(dep => tags.push(['depends', dep]));
      }
      if (data.externalRef) tags.push(['external_ref', data.externalRef]);

      const eventData = {
        kind: COORDINATION_KINDS.ACTION,
        content: data.description,
        tags,
        created_at: Math.floor(Date.now() / 1000),
      };

      return { eventData, actionId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['event-actions', variables.eventId],
      });
    },
  });
}

// Get all actions for an event
export function useEventActions(eventId: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['event-actions', eventId],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(2000)]);

      const events = await nostr.query([
        {
          kinds: [COORDINATION_KINDS.ACTION],
          '#e': [eventId],
          limit: 100,
        }
      ], { signal });

      return events.map(parseActionEvent).filter((a): a is EventAction => a !== null);
    },
  });
}

// Update action status
export function useUpdateAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      actionId: string;
      actionEventId: string;
      eventId: string;
      status: ActionStatus;
      notes?: string;
    }) => {
      const updateId = `update-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const tags: string[][] = [
        ['d', updateId],
        ['e', data.actionEventId, '', 'reply'],
        ['e', data.eventId, '', 'root'],
        ['action', data.actionId],
        ['status', data.status],
        ['alt', 'Action status update'],
      ];

      if (data.notes) tags.push(['notes', data.notes]);

      const eventData = {
        kind: COORDINATION_KINDS.ACTION_UPDATE,
        content: data.notes || `Status changed to ${data.status}`,
        tags,
        created_at: Math.floor(Date.now() / 1000),
      };

      return { eventData, updateId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['event-actions', variables.eventId],
      });
      queryClient.invalidateQueries({
        queryKey: ['action-updates', variables.actionId],
      });
    },
  });
}

// ============================================================================
// OUTCOMES
// ============================================================================

export interface EventOutcome {
  id: string;
  eventId: string;
  type: OutcomeType;
  title: string;
  content: string;
  value?: number;        // For metrics
  unit?: string;         // For metrics
  mediaUrl?: string;     // For photos
  externalRef?: string;
  createdAt: number;
  createdBy: string;
}

// Create an outcome for an event
export function useCreateOutcome() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      eventId: string;
      eventKind: number;
      eventAuthor: string;
      eventDTag: string;
      type: OutcomeType;
      title: string;
      content: string;
      value?: number;
      unit?: string;
      mediaUrl?: string;
      externalRef?: string;
    }) => {
      const outcomeId = `outcome-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const tags: string[][] = [
        ['d', outcomeId],
        ['a', `${data.eventKind}:${data.eventAuthor}:${data.eventDTag}`],
        ['e', data.eventId, '', 'root'],
        ['type', data.type],
        ['title', data.title],
        ['alt', `Event outcome: ${data.title}`],
      ];

      if (data.value !== undefined) tags.push(['value', data.value.toString()]);
      if (data.unit) tags.push(['unit', data.unit]);
      if (data.mediaUrl) tags.push(['media', data.mediaUrl]);
      if (data.externalRef) tags.push(['external_ref', data.externalRef]);

      const eventData = {
        kind: COORDINATION_KINDS.OUTCOME,
        content: data.content,
        tags,
        created_at: Math.floor(Date.now() / 1000),
      };

      return { eventData, outcomeId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['event-outcomes', variables.eventId],
      });
    },
  });
}

// Get all outcomes for an event
export function useEventOutcomes(eventId: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['event-outcomes', eventId],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(2000)]);

      const events = await nostr.query([
        {
          kinds: [COORDINATION_KINDS.OUTCOME],
          '#e': [eventId],
          limit: 100,
        }
      ], { signal });

      return events.map(parseOutcomeEvent).filter((o): o is EventOutcome => o !== null);
    },
  });
}

// ============================================================================
// SUMMARY / AGGREGATION
// ============================================================================

export interface EventCoordinationSummary {
  eventId: string;
  roles: {
    total: number;
    open: number;
    filled: number;
    items: EventRole[];
  };
  items: {
    total: number;
    needed: number;
    claimed: number;
    items: EventItem[];
  };
  actions: {
    total: number;
    pending: number;
    inProgress: number;
    done: number;
    blocked: number;
    items: EventAction[];
  };
  outcomes: {
    total: number;
    items: EventOutcome[];
  };
}

// Get complete coordination summary for an event
export function useEventCoordinationSummary(eventId: string) {
  const rolesQuery = useEventRoles(eventId);
  const itemsQuery = useEventItems(eventId);
  const actionsQuery = useEventActions(eventId);
  const outcomesQuery = useEventOutcomes(eventId);

  return useQuery({
    queryKey: ['event-coordination-summary', eventId],
    queryFn: () => {
      const roles = rolesQuery.data || [];
      const items = itemsQuery.data || [];
      const actions = actionsQuery.data || [];
      const outcomes = outcomesQuery.data || [];

      // Calculate total filled slots across all roles
      const totalFilledSlots = roles.reduce((sum, role) => sum + role.filled, 0);
      const totalSlots = roles.reduce((sum, role) => sum + role.slots, 0);

      // Calculate total claimed items
      const totalClaimedQty = items.reduce((sum, item) => sum + item.claimed, 0);
      const totalItemQty = items.reduce((sum, item) => sum + item.quantity, 0);

      const summary: EventCoordinationSummary = {
        eventId,
        roles: {
          total: roles.length,
          open: roles.filter(r => r.filled < r.slots).length, // Roles with available spots
          filled: roles.filter(r => r.filled >= r.slots).length, // Roles that are full
          items: roles,
        },
        items: {
          total: items.length,
          needed: items.filter(i => i.claimed < i.quantity).length, // Items still needed
          claimed: items.filter(i => i.claimed >= i.quantity).length, // Items fully claimed
          items,
        },
        actions: {
          total: actions.length,
          pending: actions.filter(a => a.status === 'pending').length,
          inProgress: actions.filter(a => a.status === 'in-progress').length,
          done: actions.filter(a => a.status === 'done').length,
          blocked: actions.filter(a => a.status === 'blocked').length,
          items: actions,
        },
        outcomes: {
          total: outcomes.length,
          items: outcomes,
        },
      };

      return summary;
    },
    enabled: rolesQuery.isSuccess && itemsQuery.isSuccess && actionsQuery.isSuccess && outcomesQuery.isSuccess,
  });
}

// ============================================================================
// PARSER FUNCTIONS
// ============================================================================

function parseRoleEvent(event: NostrEvent): EventRole | null {
  const dTag = event.tags.find(([n]) => n === 'd')?.[1];
  const eTag = event.tags.find(([n]) => n === 'e')?.[1];
  const title = event.tags.find(([n]) => n === 'title')?.[1];
  const slots = event.tags.find(([n]) => n === 'slots')?.[1];
  const status = event.tags.find(([n]) => n === 'status')?.[1] as RoleStatus;

  if (!dTag || !eTag || !title || !slots) return null;

  return {
    id: dTag,
    eventId: eTag,
    title,
    description: event.content,
    slots: parseInt(slots),
    filled: 0, // Will be calculated from claims
    status: status || 'open',
    timeStart: event.tags.find(([n]) => n === 'time_start')?.[1] ? parseInt(event.tags.find(([n]) => n === 'time_start')![1]) : undefined,
    timeEnd: event.tags.find(([n]) => n === 'time_end')?.[1] ? parseInt(event.tags.find(([n]) => n === 'time_end')![1]) : undefined,
    requirements: event.tags.find(([n]) => n === 'requirements')?.[1],
    externalRef: event.tags.find(([n]) => n === 'external_ref')?.[1],
    createdAt: event.created_at,
    createdBy: event.pubkey,
  };
}

function parseRoleClaimEvent(event: NostrEvent): RoleClaim | null {
  const dTag = event.tags.find(([n]) => n === 'd')?.[1];
  const roleId = event.tags.find(([n]) => n === 'role')?.[1];
  const eventId = event.tags.find(([n, , , marker]) => n === 'e' && marker === 'root')?.[1];
  const status = event.tags.find(([n]) => n === 'status')?.[1] as 'active' | 'withdrawn';

  if (!dTag || !roleId || !eventId) return null;

  return {
    id: dTag,
    roleId,
    eventId,
    claimedBy: event.pubkey,
    claimedAt: event.created_at,
    status: status || 'active',
    notes: event.tags.find(([n]) => n === 'notes')?.[1] || event.content,
  };
}

function parseItemEvent(event: NostrEvent): EventItem | null {
  const dTag = event.tags.find(([n]) => n === 'd')?.[1];
  const eTag = event.tags.find(([n]) => n === 'e')?.[1];
  const title = event.tags.find(([n]) => n === 'title')?.[1];
  const quantity = event.tags.find(([n]) => n === 'quantity')?.[1];
  const status = event.tags.find(([n]) => n === 'status')?.[1] as ItemStatus;

  if (!dTag || !eTag || !title || !quantity) return null;

  return {
    id: dTag,
    eventId: eTag,
    title,
    description: event.content,
    quantity: parseInt(quantity),
    claimed: 0, // Will be calculated from claims
    status: status || 'needed',
    category: event.tags.find(([n]) => n === 'category')?.[1],
    unit: event.tags.find(([n]) => n === 'unit')?.[1],
    externalRef: event.tags.find(([n]) => n === 'external_ref')?.[1],
    createdAt: event.created_at,
    createdBy: event.pubkey,
  };
}

function parseItemClaimEvent(event: NostrEvent): ItemClaim | null {
  const dTag = event.tags.find(([n]) => n === 'd')?.[1];
  const itemId = event.tags.find(([n]) => n === 'item')?.[1];
  const eventId = event.tags.find(([n, , , marker]) => n === 'e' && marker === 'root')?.[1];
  const quantity = event.tags.find(([n]) => n === 'quantity')?.[1];
  const status = event.tags.find(([n]) => n === 'status')?.[1] as 'active' | 'withdrawn';

  if (!dTag || !itemId || !eventId || !quantity) return null;

  return {
    id: dTag,
    itemId,
    eventId,
    claimedBy: event.pubkey,
    quantity: parseInt(quantity),
    claimedAt: event.created_at,
    status: status || 'active',
    notes: event.tags.find(([n]) => n === 'notes')?.[1] || event.content,
  };
}

function parseActionEvent(event: NostrEvent): EventAction | null {
  const dTag = event.tags.find(([n]) => n === 'd')?.[1];
  const eTag = event.tags.find(([n]) => n === 'e')?.[1];
  const title = event.tags.find(([n]) => n === 'title')?.[1];
  const status = event.tags.find(([n]) => n === 'status')?.[1] as ActionStatus;

  if (!dTag || !eTag || !title) return null;

  return {
    id: dTag,
    eventId: eTag,
    title,
    description: event.content,
    status: status || 'pending',
    assignedTo: event.tags.find(([n, , , marker]) => n === 'p' && marker === 'assigned')?.[1],
    dueDate: event.tags.find(([n]) => n === 'due_date')?.[1] ? parseInt(event.tags.find(([n]) => n === 'due_date')![1]) : undefined,
    priority: event.tags.find(([n]) => n === 'priority')?.[1] as 'low' | 'medium' | 'high' | 'urgent' | undefined,
    dependencies: event.tags.filter(([n]) => n === 'depends').map(([, v]) => v),
    externalRef: event.tags.find(([n]) => n === 'external_ref')?.[1],
    createdAt: event.created_at,
    createdBy: event.pubkey,
  };
}

function parseOutcomeEvent(event: NostrEvent): EventOutcome | null {
  const dTag = event.tags.find(([n]) => n === 'd')?.[1];
  const eTag = event.tags.find(([n]) => n === 'e')?.[1];
  const type = event.tags.find(([n]) => n === 'type')?.[1] as OutcomeType;
  const title = event.tags.find(([n]) => n === 'title')?.[1];

  if (!dTag || !eTag || !type || !title) return null;

  return {
    id: dTag,
    eventId: eTag,
    type,
    title,
    content: event.content,
    value: event.tags.find(([n]) => n === 'value')?.[1] ? parseFloat(event.tags.find(([n]) => n === 'value')![1]) : undefined,
    unit: event.tags.find(([n]) => n === 'unit')?.[1],
    mediaUrl: event.tags.find(([n]) => n === 'media')?.[1],
    externalRef: event.tags.find(([n]) => n === 'external_ref')?.[1],
    createdAt: event.created_at,
    createdBy: event.pubkey,
  };
}
