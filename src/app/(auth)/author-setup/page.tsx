"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/app/_providers/trpc-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/components/ui/use-toast";
import {
  Loader2, AlertTriangle, CheckCircle2, Eye, EyeOff, RefreshCw,
} from "lucide-react";
import Link from "next/link";

const schema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  pen_name: z.string().optional(),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[0-9]/, "Must contain at least one number"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type FormValues = z.infer<typeof schema>;

function AuthorSetupForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const token = searchParams.get("token");
  const error = searchParams.get("error");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { first_name: "", last_name: "", pen_name: "", password: "", confirmPassword: "" },
  });

  const mutation = trpc.setupAuthorAccount.useMutation({
    onSuccess: () => {
      setSuccess(true);
      setTimeout(() => router.push("/login?author_invited=true"), 3000);
    },
    onError: (err) => {
      toast({ variant: "destructive", title: "Setup Failed", description: err.message });
    },
  });

  const onSubmit = (values: FormValues) => {
    if (!token) return;
    mutation.mutate({
      token,
      first_name: values.first_name,
      last_name: values.last_name,
      pen_name: values.pen_name,
      password: values.password,
    });
  };

  if (error) {
    const cfg = {
      missing_token: { icon: AlertTriangle, title: "Missing Link", msg: "This setup link is incomplete. Please use the full link from your invitation email." },
      expired: { icon: RefreshCw, title: "Link Expired", msg: "This author invite link has expired. Ask your publisher to resend it." },
      used: { icon: CheckCircle2, title: "Already Set Up", msg: "This invite link has already been used. Try signing in." },
      invalid: { icon: AlertTriangle, title: "Invalid Link", msg: "This link is invalid or has already been changed." },
    } as const;
    const c = cfg[error as keyof typeof cfg] ?? cfg.invalid;
    const Icon = c.icon;
    return (
      <div className="bg-white border-4 border-primary p-8 gumroad-shadow space-y-6">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 border-4 border-black flex items-center justify-center">
            <Icon className="size-8" />
          </div>
          <h2 className="text-2xl font-black uppercase italic tracking-tighter">{c.title}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{c.msg}</p>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="bg-white border-4 border-primary p-8 gumroad-shadow space-y-4 text-center">
        <AlertTriangle className="size-10 mx-auto" />
        <h2 className="text-2xl font-black uppercase italic">No Token Found</h2>
        <p className="text-sm text-muted-foreground">Use the full link from your invitation email.</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="bg-white border-4 border-primary p-8 gumroad-shadow space-y-6">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-20 h-20 bg-accent border-4 border-black flex items-center justify-center gumroad-shadow">
            <CheckCircle2 className="size-10" />
          </div>
          <h2 className="text-2xl font-black uppercase italic tracking-tighter">Author Account Ready</h2>
          <p className="text-sm text-muted-foreground">Your onboarding is complete. Redirecting to sign in…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border-4 border-primary p-8 gumroad-shadow space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-black uppercase italic tracking-tighter">Set Up Your Author Account</h2>
        <p className="text-sm text-muted-foreground">
          Complete your author onboarding to access your white-label author dashboard and verification flow.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <FormField name="first_name" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel className="font-black uppercase text-[10px] tracking-widest text-primary">First Name</FormLabel>
                <FormControl><Input {...field} disabled={mutation.isPending} className="booka-input-minimal h-14" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField name="last_name" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel className="font-black uppercase text-[10px] tracking-widest text-primary">Last Name</FormLabel>
                <FormControl><Input {...field} disabled={mutation.isPending} className="booka-input-minimal h-14" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <FormField name="pen_name" control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel className="font-black uppercase text-[10px] tracking-widest text-primary">Pen Name</FormLabel>
              <FormControl><Input {...field} disabled={mutation.isPending} className="booka-input-minimal h-14" placeholder="Optional public pen name" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField name="password" control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel className="font-black uppercase text-[10px] tracking-widest text-primary">Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input type={showPassword ? "text" : "password"} {...field} disabled={mutation.isPending} className="booka-input-minimal h-14 pr-12" />
                  <button type="button" onClick={() => setShowPassword((p) => !p)} className="absolute right-4 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-100">
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField name="confirmPassword" control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel className="font-black uppercase text-[10px] tracking-widest text-primary">Confirm Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input type={showConfirm ? "text" : "password"} {...field} disabled={mutation.isPending} className="booka-input-minimal h-14 pr-12" />
                  <button type="button" onClick={() => setShowConfirm((p) => !p)} className="absolute right-4 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-100">
                    {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <Button type="submit" disabled={mutation.isPending} className="w-full booka-button-primary h-14 flex items-center justify-center gap-2">
            {mutation.isPending ? <><Loader2 className="animate-spin size-4" />Activating…</> : "Activate My Author Account"}
          </Button>
        </form>
      </Form>
    </div>
  );
}

export default function AuthorSetupPage() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Link href="/" className="text-4xl font-black uppercase italic tracking-tighter">
            Iwacumo<span className="text-accent">.</span>
          </Link>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground mt-2">
            Author Account Setup
          </p>
        </div>
        <Suspense fallback={<div className="h-64 flex items-center justify-center"><div className="w-10 h-10 border-4 border-black border-t-accent animate-spin" /></div>}>
          <AuthorSetupForm />
        </Suspense>
      </div>
    </div>
  );
}
