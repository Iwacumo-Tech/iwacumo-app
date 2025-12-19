"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/components/ui/use-toast";
import { trpc } from "@/app/_providers/trpc-provider";
import { AdminUser } from "@prisma/client";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  TAssignRoleToAdminUserSchema,
  assignRoleToAdminUserSchema,
} from "@/server/dtos";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSession } from "next-auth/react";

interface AssignRoleFormProps {
  adminUser?: AdminUser & { tenant?: { id: string; name: string | null } };
}

const AssignRoleForm = ({ adminUser }: AssignRoleFormProps) => {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const session = useSession();
  const [open, setOpen] = useState(false);

  // Get current user to determine tenant
  const { data: currentUser } = trpc.getUserById.useQuery({
    id: session.data?.user.id as string,
  });

  // Get tenant_id from current user's publisher
  const tenantId = currentUser?.publisher?.tenant_id || adminUser?.tenant_id;

  // Get available roles for dropdown
  const { data: roles } = trpc.getAdminRoles.useQuery();

  // Get publishers for the tenant (for publisher-scoped roles)
  const { data: publishers } = trpc.getAllPublisher.useQuery();
  const tenantPublishers = publishers?.filter(
    (pub) => pub.tenant_id === tenantId
  ) || [];

  // Get admin users for dropdown if not provided
  const { data: adminUsers } = trpc.getAdminUsersByTenant.useQuery(
    { tenant_id: tenantId || "" },
    { enabled: !!tenantId && !adminUser }
  );

  const form = useForm<TAssignRoleToAdminUserSchema>({
    resolver: zodResolver(assignRoleToAdminUserSchema),
    defaultValues: {
      admin_user_id: adminUser?.id || "",
      tenant_id: tenantId || "",
      role_name: "",
      publisher_id: undefined,
    },
  });

  const assignRole = trpc.assignRoleToAdminUser.useMutation({
    onSuccess: async () => {
      toast({
        title: "Success",
        variant: "default",
        description: "Successfully assigned role to staff member",
      });

      if (tenantId) {
        await utils.getAdminUsersByTenant.invalidate({ tenant_id: tenantId });
        setOpen(false);
        form.reset();
      }
    },
    onError: async (error) => {
      console.error(error);

      toast({
        title: "Error",
        variant: "destructive",
        description: error.message || "Error assigning role",
      });
    },
  });

  const onSubmit = (values: TAssignRoleToAdminUserSchema) => {
    assignRole.mutate({
      ...values,
      tenant_id: tenantId || values.tenant_id,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          data-cy="assign-role"
          className={adminUser ? "w-full" : ""}
        >
          {adminUser ? "Assign Role" : "Assign Role to Staff"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Role to Staff Member</DialogTitle>
        </DialogHeader>
        <Card>
          <CardHeader>
            <CardTitle>Role Assignment</CardTitle>
            <CardDescription>
              Assign a role to a staff member. Roles can be scoped to a specific publisher or apply tenant-wide.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <fieldset disabled={form.formState.isSubmitting}>
                  <div className="grid gap-6">
                    {!adminUser && (
                      <div className="space-y-1">
                        <FormField
                          control={form.control}
                          name="admin_user_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-700">
                                Staff Member
                              </FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger className="border-gray-300 rounded-md">
                                    <SelectValue placeholder="Select staff member" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {adminUsers?.map((user) => (
                                    <SelectItem key={user.id} value={user.id}>
                                      {user.first_name} {user.last_name} ({user.email})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                    <div className="space-y-1">
                      <FormField
                        control={form.control}
                        name="role_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-700">
                              Role
                            </FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger className="border-gray-300 rounded-md">
                                  <SelectValue placeholder="Select a role" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {roles?.map((role) => (
                                  <SelectItem key={role.name} value={role.name}>
                                    {role.name}
                                    {role.description && ` - ${role.description}`}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    {form.watch("role_name") && tenantPublishers.length > 0 && (
                      <div className="space-y-1">
                        <FormField
                          control={form.control}
                          name="publisher_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-700">
                                Publisher Scope (Optional)
                              </FormLabel>
                              <Select
                                onValueChange={(value) => field.onChange(value === "none" ? undefined : value)}
                                value={field.value || "none"}
                              >
                                <FormControl>
                                  <SelectTrigger className="border-gray-300 rounded-md">
                                    <SelectValue placeholder="Select publisher (optional - leave empty for tenant-wide role)" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="none">None (Tenant-wide)</SelectItem>
                                  {tenantPublishers.map((publisher) => (
                                    <SelectItem key={publisher.id} value={publisher.id}>
                                      {publisher.slug || publisher.id}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end my-5">
                    <Button
                      disabled={form.formState.isSubmitting}
                      className="bg-blue-600 text-white py-2 px-7 rounded-md font-medium text-xs border border-white outline-2 outline-blue-600 active:outline"
                      type="submit"
                      data-cy="assign-role-submit"
                    >
                      Assign Role
                    </Button>
                  </div>
                </fieldset>
              </form>
            </Form>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
};

export default AssignRoleForm;

