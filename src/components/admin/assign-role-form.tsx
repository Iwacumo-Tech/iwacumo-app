"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { trpc } from "@/app/_providers/trpc-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, ShieldPlus } from "lucide-react";
import {
  TAssignRoleToAdminUserSchema,
  assignRoleToAdminUserSchema,
} from "@/server/dtos";
import { type AdminUserRow } from "./admin-columns";

// Role preset descriptions shown in the dropdown
const ROLE_DESCRIPTIONS: Record<string, string> = {
  "staff-basic":     "View-only: dashboard, books, orders, customers",
  "staff-content":   "Add/edit authors, approve & publish books",
  "staff-publisher": "Manage publishers, whitelabel stores, feature books",
  "staff-finance":   "Platform stats + system settings",
  "super-admin":     "Full platform access — all permissions",
};

interface AssignRoleFormProps {
  adminUser?: any;
}

const AssignRoleForm = ({ adminUser }: AssignRoleFormProps) => {
  const { toast }       = useToast();
  const utils           = trpc.useUtils();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);

  if (!adminUser) return null;

  // Resolve tenantId directly from the target staff member's record.
  // This is always correct regardless of who the logged-in user is.
  const tenantId = adminUser.tenant_id;

  const { data: roles } = trpc.getAdminRoles.useQuery(undefined, {
    enabled: open, // only fetch when dialog is open
  });

  const form = useForm<TAssignRoleToAdminUserSchema>({
    resolver: zodResolver(assignRoleToAdminUserSchema),
    defaultValues: {
      admin_user_id: adminUser.id,
      tenant_id:     tenantId,
      role_name:     "",
      publisher_id:  undefined,
    },
  });

  const mutation = trpc.assignRoleToAdminUser.useMutation({
    onSuccess: () => {
      toast({ title: "Role assigned successfully." });
      utils.getAllAdminUsers.invalidate();
      setOpen(false);
      form.reset();
    },
    onError: (err) =>
      toast({ variant: "destructive", title: "Failed", description: err.message }),
  });

  const onSubmit = (values: TAssignRoleToAdminUserSchema) => {
    mutation.mutate({ ...values, tenant_id: tenantId });
  };

  const staffName = [adminUser.first_name, adminUser.last_name]
    .filter(Boolean).join(" ") || adminUser.email;

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) form.reset(); }}>
      <DialogTrigger asChild>
        <button className="w-full text-left px-3 py-2.5 text-xs font-black uppercase italic hover:bg-accent cursor-pointer flex items-center gap-2 transition-colors">
          <ShieldPlus className="size-3" />
          Assign Role
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-md border-4 border-black rounded-none gumroad-shadow">
        <DialogHeader className="border-b-2 border-black pb-4">
          <DialogTitle className="font-black uppercase italic tracking-tighter text-xl">
            Assign Role
          </DialogTitle>
          <p className="text-[11px] font-bold opacity-50 uppercase tracking-widest">
            {staffName}
          </p>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-2">

            {/* Role select */}
            <FormField name="role_name" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel className="font-black uppercase text-[10px] tracking-widest">
                  Access Level
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="booka-input-minimal h-12">
                      <SelectValue placeholder="Select a role..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-white border-2 border-black rounded-none">
                    {roles
                      // Only show the 5 preset staff roles — filter out core roles
                      // like "publisher", "author", "customer" which are for regular users
                      ?.filter(r => r.name.startsWith("staff-") || r.name === "super-admin")
                      .map((role) => (
                        <SelectItem
                          key={role.name}
                          value={role.name}
                          className="py-3"
                        >
                          <div>
                            <p className="font-black uppercase text-[11px] tracking-wide">
                              {role.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {ROLE_DESCRIPTIONS[role.name] ?? role.description ?? ""}
                            </p>
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            {/* Existing roles on this user — helpful context */}
            {(adminUser.roles ?? []).length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40">
                  Current Roles
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(adminUser.roles ?? []).map((r: { role_name: string }, i: number) => (
                    <span key={i}
                      className="inline-block border border-black px-2 py-0.5 text-[10px] font-black uppercase bg-white">
                      {r.role_name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={mutation.isPending || !form.watch("role_name")}
              className="w-full booka-button-primary h-12 flex items-center justify-center gap-2"
            >
              {mutation.isPending
                ? <><Loader2 className="animate-spin size-4" />Assigning...</>
                : <><ShieldPlus className="size-4" />Assign Role</>}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AssignRoleForm;