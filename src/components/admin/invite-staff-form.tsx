"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSession } from "next-auth/react";
import { trpc } from "@/app/_providers/trpc-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Loader2, Mail, UserPlus, CheckCircle2 } from "lucide-react";

const ROLE_PRESETS = [
  { name: "staff-basic",     label: "Basic Staff",         desc: "View-only: dashboard, books, orders, customers" },
  { name: "staff-content",   label: "Content Manager",     desc: "Add/edit authors, approve & publish books" },
  { name: "staff-publisher", label: "Publisher Manager",   desc: "Manage publishers, whitelabel stores, feature books" },
  { name: "staff-finance",   label: "Finance & Settings",  desc: "Platform stats + system settings" },
  { name: "super-admin",     label: "Super Administrator", desc: "Full platform access — all permissions" },
];

const schema = z.object({
  email:     z.string().email("Valid email required"),
  role_name: z.string().min(1, "Please select a role"),
});

type FormValues = z.infer<typeof schema>;

export function InviteStaffForm() {
  const { data: session } = useSession();
  const { toast }         = useToast();
  const utils             = trpc.useUtils();
  const [open, setOpen]   = useState(false);
  const [sent,  setSent]  = useState(false);
  const [sentEmail, setSentEmail] = useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", role_name: "" },
  });

  const mutation = trpc.inviteStaff.useMutation({
    onSuccess: () => {
      setSentEmail(form.getValues("email"));
      setSent(true);
      utils.getAllAdminUsers.invalidate();
    },
    onError: (err) => {
      toast({ variant: "destructive", title: "Invite Failed", description: err.message });
    },
  });

  const onSubmit = (values: FormValues) => {
    const inviterAdminId = session?.user?.id;

    // tenantSlug is set on the session by auth.ts getUserClaims for all role types.
    // For a super-admin User (not AdminUser), this is the only way to resolve tenant.
    const tenantSlug = (session as any)?.tenantSlug as string | null | undefined;

    if (!inviterAdminId) {
      toast({
        variant: "destructive",
        title: "Session Error",
        description: "Could not determine your identity. Please sign in again.",
      });
      return;
    }

    mutation.mutate({
      ...values,
      inviter_admin_id: inviterAdminId,
      tenant_slug: tenantSlug ?? null,
    });
  };

  const handleClose = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setTimeout(() => { setSent(false); setSentEmail(""); form.reset(); }, 300);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button className="booka-button-primary gap-2 h-12">
          <UserPlus className="size-4" />
          Invite Staff
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-black uppercase italic tracking-tighter text-xl">
            Invite Staff Member
          </DialogTitle>
        </DialogHeader>

        {/* ── Success state ───────────────────────────────── */}
        {sent ? (
          <div className="flex flex-col items-center text-center space-y-4 py-6">
            <div className="w-16 h-16 bg-accent border-4 border-black flex items-center justify-center gumroad-shadow">
              <CheckCircle2 className="size-8" />
            </div>
            <h3 className="font-black uppercase italic tracking-tighter text-lg">Invite Sent!</h3>
            <p className="text-sm text-muted-foreground">
              An invitation has been sent to{" "}
              <strong className="text-primary">{sentEmail}</strong>.
              They&apos;ll receive a link to set up their account.
            </p>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="booka-button-secondary"
                onClick={() => { setSent(false); setSentEmail(""); form.reset(); }}>
                Invite Another
              </Button>
              <Button className="booka-button-primary" onClick={() => handleClose(false)}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          /* ── Form state ──────────────────────────────────── */
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Enter the staff member&apos;s email and select their access level.
              They&apos;ll receive an email to complete their account setup.
            </p>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField name="email" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-black uppercase text-[10px] tracking-widest">
                      Email Address
                    </FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="colleague@company.com"
                        {...field} disabled={mutation.isPending}
                        className="booka-input-minimal h-12" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField name="role_name" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-black uppercase text-[10px] tracking-widest">
                      Access Level
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="booka-input-minimal h-12">
                          <SelectValue placeholder="Select access level..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent style={{backgroundColor: "white"}} className="border-2 border-black">
                        {ROLE_PRESETS.map((role) => (
                          <SelectItem key={role.name} value={role.name} className="py-3">
                            <div>
                              <p className="font-black uppercase text-[11px] tracking-wide">{role.label}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">{role.desc}</p>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <Button type="submit" disabled={mutation.isPending}
                  className="w-full booka-button-primary h-12 flex items-center justify-center gap-2">
                  {mutation.isPending
                    ? <><Loader2 className="animate-spin size-4" />Sending Invite...</>
                    : <><Mail className="size-4" />Send Invite</>}
                </Button>
              </form>
            </Form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}