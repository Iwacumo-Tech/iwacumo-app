"use client";
 
import { useSearchParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/app/_providers/trpc-provider";
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
import { Loader2, AlertTriangle, CheckCircle2, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
 
const schema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain at least one uppercase letter")
      .regex(/[0-9]/, "Must contain at least one number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
 
type FormValues = z.infer<typeof schema>;
 
export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const token = searchParams.get("token");
 
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState(false);
 
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  });
 
  const mutation = trpc.resetPassword.useMutation({
    onSuccess: () => {
      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    },
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "Reset Failed",
        description: err.message,
      });
    },
  });
 
  const onSubmit = (values: FormValues) => {
    if (!token) return;
    mutation.mutate({ token, password: values.password });
  };
 
  // ── No token in URL ──────────────────────────────────────────
  if (!token) {
    return (
      <div className="bg-white border-4 border-primary p-8 gumroad-shadow space-y-6">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 border-4 border-black flex items-center justify-center">
            <AlertTriangle className="size-8" />
          </div>
          <h2 className="text-2xl font-black uppercase italic tracking-tighter">
            Invalid Reset Link
          </h2>
          <p className="text-sm text-muted-foreground">
            This reset link is missing or malformed. Please request a new one.
          </p>
          <Link href="/forgot-password" className="booka-button-primary px-6 py-3 text-xs">
            Request New Link
          </Link>
        </div>
      </div>
    );
  }
 
  // ── Success state ────────────────────────────────────────────
  if (success) {
    return (
      <div className="bg-white border-4 border-primary p-8 gumroad-shadow space-y-6">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-20 h-20 bg-accent border-4 border-black flex items-center justify-center gumroad-shadow">
            <CheckCircle2 className="size-10" />
          </div>
          <h2 className="text-2xl font-black uppercase italic tracking-tighter">
            Password Updated!
          </h2>
          <p className="text-sm text-muted-foreground">
            Your password has been changed. Redirecting you to sign in...
          </p>
          <div className="w-8 h-8 border-4 border-black border-t-accent animate-spin" />
        </div>
      </div>
    );
  }
 
  // ── Form state ───────────────────────────────────────────────
  return (
    <div className="bg-white border-4 border-primary p-8 gumroad-shadow space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-black uppercase italic tracking-tighter">
          New Password
        </h2>
        <p className="text-sm text-muted-foreground">
          Choose a strong password. Min 8 characters, one uppercase, one number.
        </p>
      </div>
 
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FormField
            name="password"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-black uppercase text-[10px] tracking-widest text-primary">
                  New Password
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      {...field}
                      disabled={mutation.isPending}
                      className="booka-input-minimal h-14 pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-100"
                    >
                      {showPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
 
          <FormField
            name="confirmPassword"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-black uppercase text-[10px] tracking-widest text-primary">
                  Confirm New Password
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showConfirm ? "text" : "password"}
                      {...field}
                      disabled={mutation.isPending}
                      className="booka-input-minimal h-14 pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((p) => !p)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-100"
                    >
                      {showConfirm ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
 
          <Button
            type="submit"
            disabled={mutation.isPending}
            className="w-full booka-button-primary h-14 flex items-center justify-center gap-2"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="animate-spin size-4" />
                Updating...
              </>
            ) : (
              "Set New Password"
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}
 