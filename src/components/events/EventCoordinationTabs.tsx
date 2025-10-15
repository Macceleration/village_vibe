import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Package, ListChecks, Trophy, Info, Bug } from "lucide-react";
import { EventRolesTab } from "./coordination/EventRolesTab";
import { EventItemsTab } from "./coordination/EventItemsTab";
import { EventActionsTab } from "./coordination/EventActionsTab";
import { EventOutcomesTab } from "./coordination/EventOutcomesTab";
import { DebugCoordinationDialog } from "./coordination/DebugCoordinationDialog";
import { useEventCoordinationSummary } from "@/hooks/useEventCoordination";
import type { NostrEvent } from "@nostrify/nostrify";

interface EventCoordinationTabsProps {
  event: NostrEvent;
  isOrganizer: boolean;
  isModerator: boolean;
}

export function EventCoordinationTabs({ event, isOrganizer, isModerator }: EventCoordinationTabsProps) {
  const { data: summary, isLoading } = useEventCoordinationSummary(event.id);

  const canManage = isOrganizer || isModerator;

  return (
    <Tabs defaultValue="overview" className="space-y-6">
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="overview" className="flex items-center gap-2">
          <Info className="h-4 w-4" />
          <span className="hidden sm:inline">Overview</span>
        </TabsTrigger>
        <TabsTrigger value="roles" className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          <span className="hidden sm:inline">Roles</span>
          {!isLoading && summary && summary.roles.open > 0 && (
            <Badge variant="secondary" className="ml-1">
              {summary.roles.open}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="items" className="flex items-center gap-2">
          <Package className="h-4 w-4" />
          <span className="hidden sm:inline">Items</span>
          {!isLoading && summary && summary.items.needed > 0 && (
            <Badge variant="secondary" className="ml-1">
              {summary.items.needed}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="actions" className="flex items-center gap-2">
          <ListChecks className="h-4 w-4" />
          <span className="hidden sm:inline">Tasks</span>
          {!isLoading && summary && summary.actions.pending > 0 && (
            <Badge variant="secondary" className="ml-1">
              {summary.actions.pending}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="outcomes" className="flex items-center gap-2">
          <Trophy className="h-4 w-4" />
          <span className="hidden sm:inline">Outcomes</span>
          {!isLoading && summary && summary.outcomes.total > 0 && (
            <Badge variant="secondary" className="ml-1">
              {summary.outcomes.total}
            </Badge>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <EventOverviewTab event={event} summary={summary} isLoading={isLoading} />
      </TabsContent>

      <TabsContent value="roles">
        <EventRolesTab event={event} canManage={canManage} />
      </TabsContent>

      <TabsContent value="items">
        <EventItemsTab event={event} canManage={canManage} />
      </TabsContent>

      <TabsContent value="actions">
        <EventActionsTab event={event} canManage={canManage} />
      </TabsContent>

      <TabsContent value="outcomes">
        <EventOutcomesTab event={event} canManage={canManage} />
      </TabsContent>
    </Tabs>
  );
}

// Overview tab showing summary and gaps
function EventOverviewTab({ event, summary, isLoading }: { event: NostrEvent; summary: any; isLoading: boolean }) {
  if (isLoading) {
    return <div>Loading coordination summary...</div>;
  }

  if (!summary) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground">No coordination data yet</p>
          <DebugCoordinationDialog event={event} />
        </div>
      </div>
    );
  }

  const gaps = [];
  if (summary.roles.open > 0) {
    gaps.push(`${summary.roles.open} role${summary.roles.open > 1 ? 's' : ''} unfilled`);
  }
  if (summary.items.needed > 0) {
    gaps.push(`${summary.items.needed} item${summary.items.needed > 1 ? 's' : ''} needed`);
  }
  if (summary.actions.pending > 0) {
    gaps.push(`${summary.actions.pending} task${summary.actions.pending > 1 ? 's' : ''} pending`);
  }
  if (summary.actions.blocked > 0) {
    gaps.push(`${summary.actions.blocked} task${summary.actions.blocked > 1 ? 's' : ''} blocked`);
  }

  return (
    <div className="space-y-6">
      {/* Header with Debug */}
      <div className="flex items-center justify-end">
        <DebugCoordinationDialog event={event}>
          <Button variant="outline" size="sm">
            <Bug className="h-4 w-4 mr-2" />
            Debug
          </Button>
        </DebugCoordinationDialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Users className="h-4 w-4" />
            Roles
          </div>
          <div className="text-2xl font-bold">{summary.roles.filled}/{summary.roles.total}</div>
          <div className="text-xs text-muted-foreground">filled</div>
        </div>

        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Package className="h-4 w-4" />
            Items
          </div>
          <div className="text-2xl font-bold">{summary.items.claimed}/{summary.items.total}</div>
          <div className="text-xs text-muted-foreground">claimed</div>
        </div>

        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <ListChecks className="h-4 w-4" />
            Tasks
          </div>
          <div className="text-2xl font-bold">{summary.actions.done}/{summary.actions.total}</div>
          <div className="text-xs text-muted-foreground">completed</div>
        </div>

        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Trophy className="h-4 w-4" />
            Outcomes
          </div>
          <div className="text-2xl font-bold">{summary.outcomes.total}</div>
          <div className="text-xs text-muted-foreground">recorded</div>
        </div>
      </div>

      {/* Gaps Alert */}
      {gaps.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
          <h3 className="font-semibold text-sm mb-2">⚠️ Needs Attention</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            {gaps.map((gap, i) => (
              <li key={i}>{gap}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Event Description */}
      <div>
        <h3 className="font-semibold mb-2">About This Event</h3>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{event.content}</p>
      </div>
    </div>
  );
}
