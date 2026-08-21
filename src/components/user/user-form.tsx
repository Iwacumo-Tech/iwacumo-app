"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { User } from "@prisma/client";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TAssignRoleSchema,
  TCreateUserSchema,
  assignRoleSchema,
  createUserSchema,
} from "@/server/dtos";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { COUNTRIES } from "@/lib/countries";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface UserFormProps {
  user: User;
  action: "Add" | "Edit";
}

const UserForm = ({ user, action }: UserFormProps) => {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);

  const form = useForm<TCreateUserSchema>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      ...user,
      first_name: user.first_name ?? "",
      last_name: user.last_name ?? "",
      username: user.username ?? "",
      email: user.email ?? "",
      phone_number: user.phone_number ?? "",
      nationality: user.nationality ?? "",
      password: user.password ?? "",
      email_verified: false,
      date_of_birth: new Date(),
    },
  });

  const roleForm = useForm<TAssignRoleSchema>({
    resolver: zodResolver(assignRoleSchema),
    defaultValues: { user_id: user?.id },
  });

  const assignRoleToUser = trpc.assignRoleToUser.useMutation({
    onSuccess: async () => {
      toast({
        title: "Success",
        variant: "default",
        description: "Successfully assigned user role",
      });

      utils.getAllRoles.invalidate().then(() => {
        setOpen(false);
      });
    },
    onError: async (error) => {
      console.error(error);

      toast({
        title: "Error",
        variant: "destructive",
        description: "Error creating user",
      });
    },
  });

  const addUser = trpc.createUser.useMutation({
    onSuccess: async () => {
      toast({
        title: "Success",
        variant: "default",
        description: "Successfully created User",
      });

      utils.getAllUsers.invalidate().then(() => {
        setOpen(false);
      });
    },
    onError: async (error) => {
      console.error(error);

      toast({
        title: "Error",
        variant: "destructive",
        description: "Error creating user",
      });
    },
  });

  const updateUsers = trpc.updateUser.useMutation({
    onSuccess: async () => {
      toast({
        title: "Success",
        variant: "default",
        description: "Successfully updated User",
      });

      utils.getAllUsers.invalidate().then(() => {
        setOpen(false);
      });
    },
    onError: async (error) => {
      console.error(error);

      toast({
        title: "Error",
        variant: "destructive",
        description: "Error updating user",
      });
    },
  });

  const onSubmit = (values: TCreateUserSchema) => {
    if (user.id) {
      updateUsers.mutate({
        ...values,
        id: user.id,
      });
    } else {
      addUser.mutate({ ...values });
    }
  };

  const roleOnSubmit = (values: TAssignRoleSchema) => {
    assignRoleToUser.mutate({ ...values });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          data-cy={`${action}-user`}
          className={`${action === "Edit" ? "w-full" : ""}`}
        >
          {action} User
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{action} User</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="user-details" className="w-[400px]">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="user-details">User Details</TabsTrigger>
            <TabsTrigger value="role">User Role</TabsTrigger>
          </TabsList>
          <TabsContent value="user-details">
            <Card>
              <CardHeader>
                <CardTitle>User Details</CardTitle>
                <CardDescription>
                  Make changes to your account here. Click save when youre done.
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
                            name="username"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-gray-700">
                                  UserName
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Enter name"
                                    {...field}
                                    data-cy="user-name"
                                    className="border-gray-300 rounded-md"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
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
                                    placeholder="Enter name"
                                    {...field}
                                    data-cy="first_name"
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
                                    placeholder="Enter lecture title"
                                    {...field}
                                    data-cy="user-email"
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
                            name="phone_number"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-gray-700">
                                  Phone Number
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Enter Phone number"
                                    {...field}
                                    data-cy="user-phone-no"
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
                            name="nationality"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-gray-700">
                                  Nationality
                                </FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || ""}>
                                  <FormControl>
                                    <SelectTrigger className="border-gray-300 rounded-md">
                                      <SelectValue placeholder="Select country" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {COUNTRIES.map((country) => (
                                      <SelectItem key={country} value={country}>{country}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
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
                                    data-cy="user-paassword"
                                    className="border-gray-300 rounded-md"
                                    type="password"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={form.control}
                          name="email_verified"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center gap-2 space-y-0 pt-2">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <FormLabel className="text-gray-700 text-xs cursor-pointer">
                                Email already verified (skip verification for jumpstart accounts)
                              </FormLabel>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="flex justify-end my-5">
                        <Button
                          disabled={form.formState.isSubmitting}
                          className="bg-blue-600 text-white py-2 px-7 rounded-md font-medium text-xs border border-white outline-2 outline-blue-600 active:outline"
                          type="button"
                          onClick={form.handleSubmit(onSubmit)}
                          data-cy="user-submit"
                        >
                          {action === "Add" ? "Proceed" : "Save Changes"}
                        </Button>
                      </div>
                    </fieldset>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="role">
            <Card>
              <CardHeader>
                <CardTitle>User Role</CardTitle>
                <CardDescription>Change the your role here</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Form {...form}>
                  <form onSubmit={roleForm.handleSubmit(roleOnSubmit)}>
                    <fieldset disabled={form.formState.isSubmitting}>
                      <div className="grid gap-6">
                        <div className="space-y-1">
                          <FormField
                            control={roleForm.control}
                            name="role_name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-gray-700">
                                  Roles
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Enter name"
                                    {...field}
                                    data-cy="user-name"
                                    className="border-gray-300 rounded-md"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end my-5">
                        <Button
                          disabled={roleForm.formState.isSubmitting}
                          className="bg-blue-600 text-white py-2 px-7 rounded-md font-medium text-xs border border-white outline-2 outline-blue-600 active:outline"
                          type="submit"
                          data-cy="user-submit"
                        >
                          Assign
                        </Button>
                      </div>
                    </fieldset>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default UserForm;
