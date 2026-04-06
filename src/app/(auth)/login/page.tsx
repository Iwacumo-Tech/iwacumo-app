"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/components/ui/use-toast";
import Link from "next/link";
import { Loader2, CheckCircle2, MailWarning, UserCheck, ShieldOff } from "lucide-react";
import { useState, Suspense } from "react";
import { ResendVerificationButton } from "@/components/auth/resend-verification-button";

const loginSchema = z.object({
  username: z.string().min(1, "Email or Username is required"),
  password: z.string().min(1, "Password is required"),
});

type ErrorState =
  | { type: "email_unverified"; email: string }
  | { type: "author_not_permitted" }
  | { type: "invalid_credentials" }
  | null;

function LoginContent() {
  const router       = useRouter();
  const { toast }    = useToast();
  const searchParams = useSearchParams();

  const justVerified = searchParams.get("verified") === "true";
  const justInvited  = searchParams.get("invited")  === "true";
  const prefillEmail = searchParams.get("email")    ?? "";

  const [errorState, setErrorState] = useState<ErrorState>(null);

  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: prefillEmail, password: "" },
  });

  const { isSubmitting } = form.formState;

  const onSubmit = async (values: z.infer<typeof loginSchema>) => {
    // Clear previous error on new attempt
    setErrorState(null);

    const res = await signIn("credentials", { ...values, redirect: false });

    if (res?.error === "EMAIL_NOT_VERIFIED") {
      setErrorState({
        type:  "email_unverified",
        email: values.username.includes("@") ? values.username : "",
      });
      return;
    }

    if (res?.error === "AUTHOR_NOT_PERMITTED") {
      setErrorState({ type: "author_not_permitted" });
      return;
    }

    if (res?.error) {
      setErrorState({ type: "invalid_credentials" });
      return;
    }

    toast({ title: "Welcome back!", description: "Redirecting..." });
    router.push("/app");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">

        {/* Brand */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="bg-black p-5 border-4 border-primary gumroad-shadow mb-4">
            <img src="/yellow-logo.png" alt="Iwacumo" className="h-12 w-auto object-contain" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground">
            Sign in to your library
          </p>
        </div>

        {/* Staff setup complete */}
        {justInvited && (
          <div className="flex items-start gap-3 border-2 border-black bg-accent p-4">
            <UserCheck className="mt-0.5 shrink-0 size-5" />
            <div>
              <p className="font-black uppercase text-[11px] tracking-widest">Account Ready!</p>
              <p className="text-sm mt-1">
                Your staff account is set up. Sign in below to access your dashboard.
              </p>
            </div>
          </div>
        )}

        {/* Email verified */}
        {justVerified && !justInvited && (
          <div className="flex items-start gap-3 border-2 border-black bg-accent p-4">
            <CheckCircle2 className="mt-0.5 shrink-0 size-5" />
            <div>
              <p className="font-black uppercase text-[11px] tracking-widest">Email Verified!</p>
              <p className="text-sm mt-1">Your account is active. Sign in below.</p>
            </div>
          </div>
        )}

        {/* ── Error states ──────────────────────────────────────────────────── */}

        {/* Email not verified */}
        {errorState?.type === "email_unverified" && (
          <div className="flex items-start gap-3 border-2 border-black bg-red-50 p-4">
            <MailWarning className="mt-0.5 shrink-0 size-5 text-red-600" />
            <div className="flex-1">
              <p className="font-black uppercase text-[11px] tracking-widest text-red-700">
                Email Not Verified
              </p>
              <p className="text-sm text-red-600 mt-1">
                Please verify your email before signing in. Check your inbox or request a new link.
              </p>
              <div className="mt-3">
                <ResendVerificationButton email={errorState.email} compact />
              </div>
            </div>
          </div>
        )}

        {/* Author under non-white-label publisher */}
        {errorState?.type === "author_not_permitted" && (
          <div className="flex items-start gap-3 border-2 border-black bg-amber-50 p-4">
            <ShieldOff className="mt-0.5 shrink-0 size-5 text-amber-600" />
            <div>
              <p className="font-black uppercase text-[11px] tracking-widest text-amber-700">
                Dashboard Access Not Available
              </p>
              <p className="text-sm text-amber-700 mt-1">
                Your author account is managed by your publisher. You're credited as an author
                on books, but dashboard access is handled by the publisher on your behalf.
              </p>
              <p className="text-sm text-amber-700 mt-2">
                If you believe this is an error, please contact your publisher.
              </p>
            </div>
          </div>
        )}

        {/* Invalid credentials */}
        {errorState?.type === "invalid_credentials" && (
          <div className="flex items-start gap-3 border-2 border-black bg-red-50 p-4">
            <MailWarning className="mt-0.5 shrink-0 size-5 text-red-600" />
            <div>
              <p className="font-black uppercase text-[11px] tracking-widest text-red-700">
                Login Failed
              </p>
              <p className="text-sm text-red-600 mt-1">
                Invalid credentials. Please check and try again.
              </p>
            </div>
          </div>
        )}

        {/* Login form */}
        <div className="bg-white border-4 border-primary p-8 gumroad-shadow">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField name="username" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-black uppercase text-[10px] tracking-widest text-primary">
                    Username / Email
                  </FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isSubmitting} className="booka-input-minimal h-14" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField name="password" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-black uppercase text-[10px] tracking-widest text-primary">
                    Password
                  </FormLabel>
                  <FormControl>
                    <Input type="password" disabled={isSubmitting} {...field} className="booka-input-minimal h-14" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full booka-button-primary h-16 text-lg flex items-center justify-center gap-2"
              >
                {isSubmitting
                  ? <><Loader2 className="animate-spin h-5 w-5" />Authenticating...</>
                  : "Sign In"
                }
              </Button>
            </form>
          </Form>
        </div>

        {/* Footer links */}
        <div className="text-center space-y-4">
          <Link
            href="/forgot-password"
            className="text-[10px] text-sm font-black uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity"
          >
            Forgot Password?
          </Link>
          <div className="pt-4">
            <p className="text-sm font-bold uppercase tracking-tighter">
              New to the tribe?{" "}
              <Link href="/register" className="text-accent hover:underline underline-offset-4 font-black italic">
                Create Account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 opacity-20" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}