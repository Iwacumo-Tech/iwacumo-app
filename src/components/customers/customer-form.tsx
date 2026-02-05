"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createCustomerSchema, updateCustomerSchema } from "@/server/dtos";
import { trpc } from "@/app/_providers/trpc-provider";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2 } from "lucide-react";

const CustomerForm = ({ customer, action, trigger }: { customer?: any, action: "Add" | "Edit", trigger?: React.ReactNode }) => {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const isEditMode = action === "Edit" && customer?.id;

  const form = useForm<any>({
    resolver: zodResolver(isEditMode ? updateCustomerSchema : createCustomerSchema),
    defaultValues: { first_name: "", last_name: "", email: "", username: "", phone_number: "" }
  });

  // Pre-fill logic
  useEffect(() => {
    if (open && isEditMode && customer) {
      form.reset({
        id: customer.id,
        first_name: customer.user?.first_name || "",
        last_name: customer.user?.last_name || "",
        email: customer.user?.email || "",
        username: customer.user?.username || "",
        phone_number: customer.user?.phone_number || "",
      });
    } else if (open && !isEditMode) {
      form.reset({ first_name: "", last_name: "", email: "", username: "", password: "", phone_number: "" });
    }
  }, [open, isEditMode, customer, form]);

  const { mutate: addCustomer, isPending: isAdding } = trpc.createCustomer.useMutation({
    onSuccess: () => {
      toast({ title: "Success", description: "Customer created." });
      utils.getCustomersByUser.invalidate();
      setOpen(false);
    }
  });

  const { mutate: updateCustomer, isPending: isUpdating } = trpc.updateCustomer.useMutation({
    onSuccess: () => {
      toast({ title: "Success", description: "Customer updated." });
      utils.getCustomersByUser.invalidate();
      setOpen(false);
    }
  });

  const onSubmit = (values: any) => {
    isEditMode ? updateCustomer(values) : addCustomer(values);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || <Button>{action} Customer</Button>}</DialogTrigger>
      <DialogContent className="max-w-xl rounded-none border-4 border-black p-0 bg-[#F4F4F4] gumroad-shadow-lg">
        <div className="p-6 border-b-4 border-black bg-white sticky top-0 z-20">
          <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter">
            {action} Profile<span className="text-accent">.</span>
          </DialogTitle>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="p-8 space-y-6">
            <div className="bg-white border-2 border-black p-6 space-y-4 gumroad-shadow-sm">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="first_name" render={({ field }) => (
                  <FormItem><FormLabel className="text-[10px] font-black uppercase opacity-40">First Name</FormLabel>
                  <FormControl><Input className="input-gumroad" {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="last_name" render={({ field }) => (
                  <FormItem><FormLabel className="text-[10px] font-black uppercase opacity-40">Last Name</FormLabel>
                  <FormControl><Input className="input-gumroad" {...field} /></FormControl></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel className="text-[10px] font-black uppercase opacity-40">Email Address</FormLabel>
                <FormControl><Input disabled={isEditMode} className="input-gumroad" {...field} /></FormControl></FormItem>
              )} />
            </div>

            <Button type="submit" disabled={isAdding || isUpdating} className="w-full h-14 bg-black text-white font-black uppercase italic rounded-none border-2 border-black gumroad-shadow hover:translate-x-[2px] transition-all">
              {isAdding || isUpdating ? <Loader2 className="animate-spin" /> : `${action} Customer`}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerForm;