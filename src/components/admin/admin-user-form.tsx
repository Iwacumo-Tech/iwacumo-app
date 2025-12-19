"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  TCreateAdminUserSchema,
  TUpdateAdminUserSchema,
  createAdminUserSchema,
  updateAdminUserSchema,
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

interface AdminUserFormProps {
  adminUser: AdminUser & { tenant?: { id: string; name: string | null } };
  action: "Add" | "Edit";
}

const AdminUserForm = ({ adminUser, action }: AdminUserFormProps) => {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const session = useSession();
  const [open, setOpen] = useState(false);

  // Get current user to determine tenant
  const { data: currentUser } = trpc.getUserById.useQuery({
    id: session.data?.user.id as string,
  });

  console.log("This is currentUser: ", currentUser);

  // Get tenant_id from current user's publisher
  const tenantId = currentUser?.publisher?.tenant_id;

  // Get available roles for dropdown
  const { data: roles } = trpc.getAdminRoles.useQuery();

  // Get publishers for the tenant (for publisher-scoped roles)
  const { data: publishers } = trpc.getAllPublisher.useQuery();
  const tenantPublishers = publishers?.filter(
    (pub) => pub.tenant_id === tenantId
  ) || [];

  const form = useForm<TCreateAdminUserSchema | TUpdateAdminUserSchema>({
    resolver: zodResolver(action === "Add" ? createAdminUserSchema : updateAdminUserSchema),
    defaultValues: {
      ...adminUser,
      first_name: adminUser.first_name ?? "",
      last_name: adminUser.last_name ?? "",
      email: adminUser.email ?? "",
      tenant_id: adminUser.tenant_id || tenantId || "",
      role_name: undefined,
      publisher_id: undefined,
      status: (adminUser.status as "invited" | "active" | "suspended" | "archived") || "invited",
    },
  });

  const addAdminUser = trpc.createAdminUser.useMutation({
    onSuccess: async () => {
      toast({
        title: "Success",
        variant: "default",
        description: "Successfully created staff member",
      });

      utils.getAdminUsersByTenant.invalidate({ tenant_id: tenantId || "" }).then(() => {
        setOpen(false);
      });
    },
    onError: async (error) => {
      console.error(error);

      toast({
        title: "Error",
        variant: "destructive",
        description: error.message || "Error creating staff member",
      });
    },
  });

  const updateAdminUser = trpc.updateAdminUser.useMutation({
    onSuccess: async () => {
      toast({
        title: "Success",
        variant: "default",
        description: "Successfully updated staff member",
      });

      utils.getAdminUsersByTenant.invalidate({ tenant_id: tenantId || "" }).then(() => {
        setOpen(false);
      });
    },
    onError: async (error) => {
      console.error(error);

      toast({
        title: "Error",
        variant: "destructive",
        description: error.message || "Error updating staff member",
      });
    },
  });

  const onSubmit = (values: TCreateAdminUserSchema | TUpdateAdminUserSchema) => {
    if (adminUser.id && action === "Edit") {
      updateAdminUser.mutate({
        ...values,
        id: adminUser.id,
      } as TUpdateAdminUserSchema);
    } else {
      // Always use tenantId from the query, not from form values
      // tenantId comes from currentUser?.publisher?.tenant_id
      if (!tenantId || tenantId === "") {
        toast({
          title: "Error",
          variant: "destructive",
          description: "Unable to determine organization. Please ensure you are associated with an organization.",
        });
        return;
      }

      addAdminUser.mutate({
        ...values,
        tenant_id: tenantId, // Always use the tenantId from the query, ignore form value
      } as TCreateAdminUserSchema);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          data-cy={`${action}-admin-user`}
          className={`${action === "Edit" ? "w-full" : ""}`}
        >
          {action} Staff Member
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{action} Staff Member</DialogTitle>
        </DialogHeader>
        <Card>
          <CardHeader>
            <CardTitle>Staff Member Details</CardTitle>
            <CardDescription>
              {action === "Add" 
                ? "Add a new staff member to your organization" 
                : "Update staff member information"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <fieldset disabled={form.formState.isSubmitting}>
                  <div className="grid gap-6">
                    <div className="space-y-1">
                      <FormField
                        control={form.control}
                        name="first_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-700">
                              First Name
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter first name"
                                {...field}
                                data-cy="admin-first-name"
                                className="border-gray-300 rounded-md"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="space-y-1">
                      <FormField
                        control={form.control}
                        name="last_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-700">
                              Last Name
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter last name"
                                {...field}
                                data-cy="admin-last-name"
                                className="border-gray-300 rounded-md"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="space-y-1">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-700">
                              Email
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter email"
                                {...field}
                                data-cy="admin-email"
                                className="border-gray-300 rounded-md"
                                type="email"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    {action === "Add" && (
                      <div className="space-y-1">
                        <FormField
                          control={form.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-700">
                                Password
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter password"
                                  {...field}
                                  data-cy="admin-password"
                                  className="border-gray-300 rounded-md"
                                  type="password"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                    {action === "Edit" && (
                      <div className="space-y-1">
                        <FormField
                          control={form.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-700">
                                New Password (leave empty to keep current)
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter new password"
                                  {...field}
                                  data-cy="admin-password"
                                  className="border-gray-300 rounded-md"
                                  type="password"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                    {action === "Add" && (
                      <>
                        {/* Hidden field to ensure tenant_id is always set from query */}
                        <FormField
                          control={form.control}
                          name="tenant_id"
                          render={({ field }) => (
                            <input type="hidden" {...field} value={tenantId || ""} />
                          )}
                        />
                        <div className="space-y-1">
                          <FormField
                            control={form.control}
                            name="role_name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-gray-700">
                                  Role (Optional)
                                </FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger className="border-gray-300 rounded-md">
                                      <SelectValue placeholder="Select a role (optional)" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {roles?.map((role) => (
                                      <SelectItem
                                        key={role.name}
                                        value={role.name}
                                      >
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
                                        <SelectItem
                                          key={publisher.id}
                                          value={publisher.id}
                                        >
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
                      </>
                    )}
                  </div>
                  <div className="flex justify-end my-5">
                    <Button
                      disabled={form.formState.isSubmitting}
                      className="bg-blue-600 text-white py-2 px-7 rounded-md font-medium text-xs border border-white outline-2 outline-blue-600 active:outline"
                      type="button"
                      onClick={form.handleSubmit(onSubmit)}
                      data-cy="admin-submit"
                    >
                      {action === "Add" ? "Create Staff Member" : "Save Changes"}
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

export default AdminUserForm;

