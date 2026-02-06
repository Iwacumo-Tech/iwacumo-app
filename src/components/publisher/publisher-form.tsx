"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  createPublisherSchema, 
  updatePublisherSchema,
} from "@/server/dtos";
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
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Loader2, CheckCircle2, AlertCircle, Building2, User, Lock, Fingerprint } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

interface PublisherFormProps {
  publisher?: any; 
  action: "Add" | "Edit";
  trigger?: React.ReactNode;
}

const PublisherForm = ({ publisher, action, trigger }: PublisherFormProps) => {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const isEditMode = action === "Edit" && publisher?.id;

  // 1. Setup Form with proper defaults
  const form = useForm<any>({
    resolver: zodResolver(isEditMode ? updatePublisherSchema : createPublisherSchema),
    defaultValues: {
      tenant_name: "",
      slug: "",
      first_name: "",
      last_name: "",
      email: "",
      username: "", 
      password: "", 
      bio: "",
    }
  });

  // 2. Pre-fill logic using Reset
  useEffect(() => {
    if (open && isEditMode && publisher) {
      form.reset({
        id: publisher.id,
        tenant_id: publisher.tenant_id,
        tenant_name: publisher.tenant?.name || "",
        slug: publisher.slug || "",
        first_name: publisher.user?.first_name || "",
        last_name: publisher.user?.last_name || "",
        email: publisher.user?.email || "",
        bio: publisher.bio || "",
        profile_picture: publisher.profile_picture || "",
      });
    } else if (open && !isEditMode) {
      form.reset({
        tenant_name: "", slug: "", first_name: "", last_name: "", email: "", bio: "", password: "", username: ""
      });
    }
  }, [open, isEditMode, publisher, form]);

  const slugValue = form.watch("slug");
  const debouncedSlug = useDebounce(slugValue, 500);
  
  const shouldCheckSlug = debouncedSlug && debouncedSlug.length > 2 && debouncedSlug !== publisher?.slug;
  const { data: slugStatus, isFetching: isCheckingSlug } = trpc.checkSlugAvailability.useQuery(
    { slug: debouncedSlug },
    { enabled: !!shouldCheckSlug }
  );

  const { mutate: addPublisher, isPending: isAdding } = trpc.createPublisher.useMutation({
    onSuccess: () => {
      toast({ title: "Entity Created", description: "Organization and Publisher are live." });
      utils.getAllPublisher.invalidate();
      setOpen(false);
    },
    onError: (err) => toast({ variant: "destructive", title: "Error", description: err.message })
  });

  const { mutate: updatePublisher, isPending: isUpdating } = trpc.updatePublisher.useMutation({
    onSuccess: () => {
      toast({ title: "Updated", description: "Changes saved successfully." });
      utils.getAllPublisher.invalidate();
      setOpen(false);
    }
  });

  const onSubmit = (values: any) => {
    if (slugStatus?.available === false && debouncedSlug !== publisher?.slug) {
      return toast({ variant: "destructive", title: "Invalid Slug", description: "This slug is already taken." });
    }

    if (isEditMode) {
      updatePublisher({
        id: publisher.id,
        tenant_id: publisher.tenant_id,
        tenant_name: values.tenant_name,
        slug: values.slug,
        bio: values.bio,
        profile_picture: values.profile_picture,
      });
    } else {
      addPublisher(values);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || <Button className="booka-button-primary">Add Publisher</Button>}</DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-none border-4 border-black p-0 bg-[#F4F4F4] gumroad-shadow-lg">
        <div className="p-6 border-b-4 border-black bg-white sticky top-0 z-20">
          <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter">
            {action} Publisher Entity<span className="text-accent">.</span>
          </DialogTitle>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="p-8 space-y-8">
            
            {/* SECTION 1: ORGANIZATION DATA */}
            <section className="space-y-4">
              <h3 className="font-black uppercase text-xs italic opacity-40 flex items-center gap-2">
                <Building2 size={14} /> Organization Details
              </h3>
              <div className="bg-white border-2 border-black p-6 space-y-4 gumroad-shadow-sm">
                <FormField control={form.control} name="tenant_name" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase">Organization Name</FormLabel>
                    <FormControl><Input className="input-gumroad" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                
                <FormField control={form.control} name="slug" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase">Storefront Slug</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input className={cn("input-gumroad pr-10", 
                          slugStatus?.available === false && debouncedSlug !== publisher?.slug && "border-red-500 bg-red-50"
                        )} {...field} />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {isCheckingSlug ? <Loader2 className="animate-spin size-4 opacity-50" /> : 
                            shouldCheckSlug && slugStatus?.available ? <CheckCircle2 className="text-green-600 size-4" /> :
                            shouldCheckSlug && !slugStatus?.available ? <AlertCircle className="text-red-600 size-4" /> : null}
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </section>

            {/* SECTION 2: PERSONAL & AUTH DATA */}
            <section className="space-y-4">
              <h3 className="font-black uppercase text-xs italic opacity-40 flex items-center gap-2">
                <User size={14} /> Account Credentials
              </h3>
              <div className="bg-white border-2 border-black p-6 space-y-4 gumroad-shadow-sm">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="first_name" render={({ field }) => (
                    <FormItem><FormLabel className="text-[10px] font-black uppercase">First Name</FormLabel><FormControl><Input className="input-gumroad" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="last_name" render={({ field }) => (
                    <FormItem><FormLabel className="text-[10px] font-black uppercase">Last Name</FormLabel><FormControl><Input className="input-gumroad" {...field} /></FormControl></FormItem>
                  )} />
                </div>

                {/* Only show Username and Password on "Add" mode */}
                {!isEditMode && (
                  <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                    <FormField control={form.control} name="username" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase flex items-center gap-1"><Fingerprint size={10}/> Username</FormLabel>
                        <FormControl><Input className="input-gumroad" placeholder="johndoe" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="password" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase flex items-center gap-1"><Lock size={10}/> Password</FormLabel>
                        <FormControl><Input type="password" className="input-gumroad" placeholder="••••••••" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                )}

                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel className="text-[10px] font-black uppercase">Email Address</FormLabel><FormControl><Input disabled={isEditMode} className="input-gumroad" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                
                <FormField control={form.control} name="bio" render={({ field }) => (
                  <FormItem><FormLabel className="text-[10px] font-black uppercase">Publisher Bio</FormLabel><FormControl><Input className="input-gumroad" {...field} /></FormControl></FormItem>
                )} />
              </div>
            </section>

            <Button type="submit" disabled={isAdding || isUpdating || (isCheckingSlug && shouldCheckSlug)} className="w-full h-16 bg-accent border-2 border-black font-black uppercase text-lg gumroad-shadow hover:translate-x-[2px] transition-all">
              {isAdding || isUpdating ? <Loader2 className="animate-spin" /> : `${action} Publisher`}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default PublisherForm;