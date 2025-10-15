import { useState } from "react";
import type { NostrEvent } from "@nostrify/nostrify";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useNostrPublish } from "@/hooks/useNostrPublish";
import { useEventRoles, useCreateRole, useClaimRole, useRoleClaims } from "@/hooks/useEventCoordination";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Users, Clock } from "lucide-react";
import { CreateRoleDialog } from "./CreateRoleDialog";
import { RoleCard } from "./RoleCard";

interface EventRolesTabProps {
  event: NostrEvent;
  canManage: boolean;
}

export function EventRolesTab({ event, canManage }: EventRolesTabProps) {
  const { user } = useCurrentUser();
  const { data: roles, isLoading } = useEventRoles(event.id);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const openRoles = roles?.filter(r => r.status === 'open') || [];
  const filledRoles = roles?.filter(r => r.status === 'filled') || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Event Roles</h2>
          <p className="text-sm text-muted-foreground">
            Sign up for responsibilities and shifts
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Role
          </Button>
        )}
      </div>

      {/* Empty State */}
      {!roles || roles.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-semibold mb-2">No Roles Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {canManage
                ? "Add roles to coordinate volunteers and responsibilities"
                : "The organizer hasn't added any roles yet"}
            </p>
            {canManage && (
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Role
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Open Roles */}
          {openRoles.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold">Open Roles ({openRoles.length})</h3>
              {openRoles.map(role => (
                <RoleCard
                  key={role.id}
                  role={role}
                  event={event}
                  canManage={canManage}
                />
              ))}
            </div>
          )}

          {/* Filled Roles */}
          {filledRoles.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold">Filled Roles ({filledRoles.length})</h3>
              {filledRoles.map(role => (
                <RoleCard
                  key={role.id}
                  role={role}
                  event={event}
                  canManage={canManage}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Create Role Dialog */}
      {canManage && (
        <CreateRoleDialog
          event={event}
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
        />
      )}
    </div>
  );
}
