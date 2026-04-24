"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createAuthorSchema, updateAuthorSchema } from "@/server/dtos";
import { trpc } from "@/app/_providers/trpc-provider";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";

const AuthorForm = ({ author, action, trigger }: { author?: any; action: "Add" | "Edit"; trigger?: React.ReactNode }) => {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const isEditMode = action === "Edit" && !!author?.id;
  const { data: session } = useSession();
  const publisherId = session?.user?.publisher_id ?? null;
  const { data: publishers } = trpc.getAllPublisher.useQuery(undefined, {
    enabled: !!publisherId && !isEditMode,
  });
  const currentPublisher = publishers?.find((publisher: any) => publisher.id === publisherId);
  const isWhiteLabelPublisher = !!currentPublisher?.white_label;

  const currentSchema = isEditMode ? updateAuthorSchema : createAuthorSchema;

  const form = useForm<any>({
    resolver: zodResolver(currentSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      pen_name: "",
      email: "",
      username: "",
      password: "",
      phone_number: ""
    }
  });

  // FIX 2: Reset logic with a safety check for 'open' state
  useEffect(() => {
    if (open) {
      if (isEditMode && author) {
        form.reset({
          id: author.id,
          first_name: author.user?.first_name || "",
          last_name: author.user?.last_name || "",
          pen_name: author.pen_name || "",
          email: author.user?.email || "",
          username: author.user?.username || "",
          phone_number: author.user?.phone_number || "",
        });
      } else {
        form.reset({
          first_name: "",
          last_name: "",
          pen_name: "",
          email: "",
          username: "",
          password: "",
          phone_number: ""
        });
      }
    }
  }, [open, isEditMode, author, form]);

  const { mutate: addAuthor, isPending: isAdding } = trpc.createAuthor.useMutation({
    onSuccess: (result) => {
      toast({
        title: "Success",
        description:
          result?.onboarding_mode === "invite"
            ? "Author invite sent successfully."
            : "Author added to your roster.",
      });
      utils.getAllAuthors.invalidate();
      utils.getAuthorsByUser.invalidate();
      setOpen(false);
    },
    onError: (err) => toast({ variant: "destructive", title: "Error", description: err.message })
  });

  const { mutate: updateAuthor, isPending: isUpdating } = trpc.updateAuthor.useMutation({
    onSuccess: () => {
      toast({ title: "Success", description: "Author profile updated." });
      utils.getAuthorsByUser.invalidate();
      setOpen(false);
    },
    onError: (err) => toast({ variant: "destructive", title: "Error", description: err.message })
  });

  const onSubmit = (values: any) => {
    if (isEditMode) {
      updateAuthor(values);
    } else {
      addAuthor(values);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button className="booka-button-primary">{action} Author</Button>}
      </DialogTrigger>
      
      <DialogContent className="max-w-xl rounded-none border-4 border-black p-0 bg-[#F4F4F4] gumroad-shadow-lg">
        <div className="p-6 border-b-4 border-black bg-white sticky top-0 z-20">
          <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter">
            {action} Author<span className="text-accent">.</span>
          </DialogTitle>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="p-8 space-y-6">
            <div className="bg-white border-2 border-black p-6 space-y-4 gumroad-shadow-sm">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="first_name" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase opacity-40">First Name</FormLabel>
                    <FormControl><Input className="input-gumroad" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="last_name" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase opacity-40">Last Name</FormLabel>
                    <FormControl><Input className="input-gumroad" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="pen_name" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase opacity-40">Pen Name</FormLabel>
                  <FormControl><Input className="input-gumroad" placeholder="Optional public author name" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {isEditMode && (
                <FormField control={form.control} name="username" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase opacity-40">Username</FormLabel>
                    <FormControl><Input className="input-gumroad" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              )}

              {!isEditMode && isWhiteLabelPublisher && (
                <>
                  <div className="border-2 border-black bg-[#f9f6f0] p-4 text-xs font-bold leading-relaxed">
                    White-label authors are onboarded by invite. Add their email and we&apos;ll send a setup link so they can activate their account and complete KYC.
                  </div>
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase opacity-40">Email Address</FormLabel>
                      <FormControl><Input className="input-gumroad" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </>
              )}

              {isEditMode && (
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase opacity-40">Email Address</FormLabel>
                    <FormControl><Input disabled className="input-gumroad" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              )}
            </div>

            <Button 
              type="submit" 
              disabled={isAdding || isUpdating} 
              className="w-full h-14 bg-black text-white font-black uppercase italic border-2 border-black gumroad-shadow hover:translate-x-[2px] transition-all"
            >
              {(isAdding || isUpdating) ? <Loader2 className="animate-spin" /> : !isEditMode && isWhiteLabelPublisher ? "Invite Author" : `${action} Author`}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AuthorForm;
