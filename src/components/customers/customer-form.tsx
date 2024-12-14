"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { createCustomerSchema, TCreateCustomerSchema } from "@/server/dtos"; // Ensure this schema is defined for customer
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/components/ui/use-toast";
import { trpc } from "@/app/_providers/trpc-provider";
import { Customer } from "@prisma/client";

interface CustomerFormProps {
  customer?: Customer;
  action: "Add" | "Edit";
}

const CustomerForm = ({ customer, action }: CustomerFormProps) => {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);

  const form = useForm<TCreateCustomerSchema>({
    resolver: zodResolver(createCustomerSchema),
    defaultValues: { id: customer?.id ?? "" },
  });

  const addCustomer = trpc.createCustomer.useMutation({
    onSuccess: async () => {
      toast({
        title: "Success",
        variant: "default",
        description: "Successfully created a Customer",
      });

      utils.getAllCustomers.invalidate().then(() => {
        setOpen(false);
      });
    },
    onError: (error) => {
      console.error(error);

      toast({
        title: "Error",
        variant: "destructive",
        description: "Error creating customer",
      });
    },
  });

  const updateCustomer = trpc.updateCustomer.useMutation({
    onSuccess: async () => {
      toast({
        title: "Success",
        variant: "default",
        description: "Successfully updated Customer",
      });

      utils.getAllCustomers.invalidate().then(() => {
        setOpen(false);
      });
    },
    onError: (error) => {
      console.error(error);

      toast({
        title: "Error",
        variant: "destructive",
        description: "Error updating customer",
      });
    },
  });

  const onSubmit = (values: TCreateCustomerSchema) => {
    if (customer?.id) {
      updateCustomer.mutate({
        ...values,
        id: customer.id,
      });
    } else {
      addCustomer.mutate(values);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className={`${action === "Edit" ? "w-full" : ""}`}>
          {action} Customer
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto space-y-3">
        <DialogHeader>
          <DialogTitle>{action} Customer</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="customer-details" className="w-[400px]">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="customer-details">Customer Details</TabsTrigger>
            <TabsTrigger value="role">Customer Role</TabsTrigger>
          </TabsList>
          <TabsContent value="customer-details">
            <Card>
              <CardHeader>
                <CardTitle>Customer Details</CardTitle>
                <CardDescription>
                  Make changes to your customer here.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)}>
                    <fieldset disabled={form.formState.isSubmitting}>

                      <div className="grid gap-6">
                        <FormField
                          control={form.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-700">UserName</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter customer name"
                                  {...field}
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
                              <FormLabel className="text-gray-700">Email</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="example@gmail.com"
                                  {...field}
                                  data-cy="customer-email"
                                  className="border-gray-300 rounded-md"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid gap-6">
                        <FormField
                          control={form.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-700">Password</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter Password"
                                  {...field}
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
                              <FormLabel className="text-gray-700">Phone Number</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter Phone number"
                                  {...field}
                                  data-cy="customer-phone-no"
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
                          data-cy="customer-submit"
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

          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerForm;
