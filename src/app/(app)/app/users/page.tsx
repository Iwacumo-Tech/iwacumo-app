"use client";

import { trpc } from "@/app/_providers/trpc-provider";
import { useSession } from "next-auth/react";
import { DataTable } from "@/components/table/data-table";
import { buildAdminColumns, type AdminUserRow } from "@/components/admin/admin-columns";
import { adminRoleColumns }  from "@/components/admin/admin-role-columns";
import { buildUserColumns, type PlatformUserRow } from "@/components/admin/user-columns";
import { InviteStaffForm }   from "@/components/admin/invite-staff-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { Users, ShieldCheck, MailX, Loader2 } from "lucide-react";
import { useMemo } from "react";

export default function UsersPage() {
  const { data: session } = useSession();
  const { toast }         = useToast();
  const utils             = trpc.useUtils();

  const { data: allStaff, isLoading } = trpc.getAllAdminUsers.useQuery();
  const { data: allUsers, isLoading: usersLoading } = trpc.getAllUsers.useQuery();

  const resendMutation = trpc.resendStaffInvite.useMutation({
    onSuccess: () => {
      toast({ title: "Invite resent", description: "A fresh invitation has been sent." });
      utils.getAllAdminUsers.invalidate();
    },
    onError: (err) => {
      toast({ variant: "destructive", title: "Failed to resend", description: err.message });
    },
  });
  const toggleUserActiveMutation = trpc.toggleUserActive.useMutation({
    onSuccess: (_, variables) => {
      toast({
        title: variables.active ? "User restored" : "User suspended",
        description: variables.active ? "This user can sign in again." : "This user can no longer sign in until restored.",
      });
      utils.getAllUsers.invalidate();
    },
    onError: (err) => {
      toast({ variant: "destructive", title: "Action failed", description: err.message });
    },
  });
  const softDeleteUserMutation = trpc.deleteUser.useMutation({
    onSuccess: () => {
      toast({ title: "User deleted", description: "The account has been removed from the active user list." });
      utils.getAllUsers.invalidate();
    },
    onError: (err) => {
      toast({ variant: "destructive", title: "Delete failed", description: err.message });
    },
  });
  const permanentDeleteUserMutation = trpc.permanentDeleteUser.useMutation({
    onSuccess: () => {
      toast({ title: "User permanently deleted", description: "The account has been removed permanently." });
      utils.getAllUsers.invalidate();
    },
    onError: (err) => {
      toast({ variant: "destructive", title: "Permanent delete failed", description: err.message });
    },
  });

  const handleResend = (adminUserId: string) => {
    const inviterAdminId = session?.user?.id;
    if (!inviterAdminId) return;
    resendMutation.mutate({ admin_user_id: adminUserId, inviter_admin_id: inviterAdminId });
  };

  // Build columns with the resend callback injected — memoised so
  // the column reference is stable across renders
  const staffColumns = useMemo(
    () =>
      buildAdminColumns({
        onResendInvite: handleResend,
        resendPending: resendMutation.isPending,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [resendMutation.isPending]
  );
  const userColumns = useMemo(
    () =>
      buildUserColumns({
        onToggleActive: (row) =>
          toggleUserActiveMutation.mutate({ id: row.id, active: !row.active }),
        onSoftDelete: (row) => {
          if (window.confirm(`Delete ${row.email} from the active user list?`)) {
            softDeleteUserMutation.mutate({ id: row.id });
          }
        },
        onPermanentDelete: (row) => {
          const confirmation = window.prompt(`Type "delete" to permanently delete ${row.email}.`);
          if (confirmation === "delete") {
            permanentDeleteUserMutation.mutate({ id: row.id, confirmation });
          }
        },
        isBusy:
          toggleUserActiveMutation.isPending ||
          softDeleteUserMutation.isPending ||
          permanentDeleteUserMutation.isPending,
      }),
    [
      permanentDeleteUserMutation,
      softDeleteUserMutation,
      toggleUserActiveMutation,
    ]
  );

  const total   = allStaff?.length ?? 0;
  const active  = allStaff?.filter((u) => u.status === "active").length  ?? 0;
  const pending = allStaff?.filter((u) => u.status === "invited").length ?? 0;
  const totalUsers = allUsers?.length ?? 0;
  const activeUsers = allUsers?.filter((user) => user.active && !user.deleted_at).length ?? 0;
  const suspendedUsers = allUsers?.filter((user) => !user.active && !user.deleted_at).length ?? 0;

  return (
    <div className="space-y-10">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b-4 border-black pb-8">
        <div>
          <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter">
            Staff<span className="text-accent">.</span>
          </h1>
          <p className="font-bold text-xs uppercase opacity-40 tracking-widest mt-2">
            Manage your team and their access levels
          </p>
        </div>
        <InviteStaffForm />
      </div>

      {/* ── Stat cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
        {[
          { label: "Total Staff",   value: total,         Icon: Users       },
          { label: "Active Staff",  value: active,        Icon: ShieldCheck },
          { label: "Pending Setup", value: pending,       Icon: MailX       },
          { label: "All Users",     value: totalUsers,    Icon: Users       },
          { label: "Active Users",  value: activeUsers,   Icon: ShieldCheck },
          { label: "Suspended",     value: suspendedUsers, Icon: MailX      },
        ].map(({ label, value, Icon }) => (
          <div key={label} className="booka-stat-card flex items-center gap-4">
            <div className="w-10 h-10 border-2 border-black flex items-center justify-center shrink-0">
              <Icon className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-black">{value}</p>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-50">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Pending banner ──────────────────────────────────── */}
      {pending > 0 && (
        <div className="flex items-start gap-3 border-2 border-black bg-accent p-4">
          <MailX className="size-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-black uppercase text-[11px] tracking-widest">
              {pending} pending invite{pending > 1 ? "s" : ""}
            </p>
            <p className="text-sm mt-1">
              These staff members haven&apos;t completed their account setup.
              Use the dropdown on each row to resend if the link has expired.
            </p>
          </div>
        </div>
      )}

      {/* ── Tables ─────────────────────────────────────────── */}
      {isLoading || usersLoading ? (
        <div className="flex items-center gap-3 p-8 text-sm font-bold uppercase tracking-widest opacity-40">
          <Loader2 size={16} className="animate-spin" />
          Loading people...
        </div>
      ) : (
        <Tabs defaultValue="staff">
          <TabsList className="border-b-4 border-black rounded-none bg-transparent gap-1 h-auto pb-0">
            {[
              { value: "staff", label: "All Staff"        },
              { value: "roles", label: "Role Assignments" },
              { value: "users", label: "All Users"        },
            ].map(({ value, label }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="font-black uppercase text-[10px] tracking-widest rounded-none border-2 border-transparent
                           data-[state=active]:border-black data-[state=active]:bg-accent
                           data-[state=active]:text-black h-10 px-6"
              >
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="staff" className="mt-6">
            <DataTable<AdminUserRow, any>
              columns={staffColumns}
              data={allStaff ?? []}
              filterColumnId="email"           
              filterInputPlaceholder="Search staff by email..." 
            />
          </TabsContent>

          <TabsContent value="roles" className="mt-6">
            <DataTable<AdminUserRow, any>
              columns={adminRoleColumns}
              data={allStaff ?? []}
              filterColumnId="email"           
              filterInputPlaceholder="Search roles by email..." 
            />
          </TabsContent>

          <TabsContent value="users" className="mt-6">
            <DataTable<PlatformUserRow, any>
              columns={userColumns}
              data={(allUsers ?? []) as PlatformUserRow[]}
              filterColumnId="email"
              filterInputPlaceholder="Search users by email..."
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
