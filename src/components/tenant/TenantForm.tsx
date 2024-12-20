"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { createTenantSchema, TCreateTenantSchema } from "@/server/dtos";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Tenant } from "@prisma/client";

interface TenantFormProps {
  tenant?: Tenant;
  action: "Add" | "Edit";
}

const TenantForm = ({ tenant, action }: TenantFormProps) => {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);

  const form = useForm<TCreateTenantSchema>({
    resolver: zodResolver(createTenantSchema),
    defaultValues: {
      name: tenant?.name ?? "",
      contact_email: tenant?.contact_email ?? "",
      custom_domain: tenant?.custom_domain ?? "",
      slug: tenant?.slug ?? "",
    },
  });

  const addTenant = trpc.createTenant.useMutation({
    onSuccess: async () => {
      toast({
        title: "Success",
        variant: "default",
        description: "Successfully added a new tenant",
      });

      utils.getAllTenant.invalidate();
    },
    onError: (error) => {
      console.error(error);

      toast({
        title: "Error",
        variant: "destructive",
        description: "Error adding the tenant",
      });
    },
  });

  const updateTenant = trpc.updateTenant.useMutation({
    onSuccess: async () => {
      toast({
        title: "Success",
        variant: "default",
        description: "Successfully updated the tenant",
      });

      utils.getAllTenant.invalidate().then(() => {
        setOpen(false);
      });
    },
    onError: (error) => {
      console.error(error);

      toast({
        title: "Error",
        variant: "destructive",
        description: "Error updating the tenant",
      });
    },
  });

  const onSubmit = async (values: TCreateTenantSchema) => {
    if (tenant?.id) {
      updateTenant.mutate({
        ...values,
        id: tenant.id,
      });
    } else {
      addTenant.mutate(values);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className={`${action === "Edit" ? "w-full" : ""}`}>
          {action} Tenant
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto space-y-3">
        <DialogHeader>
          <DialogTitle>{action} Tenant</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <fieldset disabled={form.formState.isSubmitting}>
              <div className="grid gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700">Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter tenant name"
                          {...field}
                          className="border-gray-300 rounded-md"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contact_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700">
                        Contact Email
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter contact email"
                          {...field}
                          className="border-gray-300 rounded-md"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="custom_domain"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700">
                        Custom Domain
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter custom domain"
                          {...field}
                          className="border-gray-300 rounded-md"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700">Slug</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter tenant slug"
                          {...field}
                          className="border-gray-300 rounded-md"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex justify-end my-5">
                <Button
                  disabled={form.formState.isSubmitting}
                  className="bg-blue-600 text-white py-2 px-7 rounded-md"
                  type="submit"
                  data-cy="tenant-submit"
                >
                  {action === "Add" ? "Proceed" : "Save Changes"}
                </Button>
              </div>
            </fieldset>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default TenantForm;
