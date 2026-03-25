"use client";
 
import { useState } from "react";
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
import { Loader2, Mail, CheckCircle2 } from "lucide-react";
 
const schema = z.object({
  email: z.string().email("Please enter a valid email address"),
});
 
type FormValues = z.infer<typeof schema>;
 
export function ForgotPasswordForm() {
  const [submitted, setSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");
 
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });
 
  const mutation = trpc.forgotPassword.useMutation({
    onSuccess: () => {
      setSubmittedEmail(form.getValues("email"));
      setSubmitted(true);
    },
    onError: (err) => {
      // TOO_MANY_REQUESTS is the only real error we surface
      form.setError("email", { message: err.message });
    },
  });
 
  const onSubmit = (values: FormValues) => {
    mutation.mutate({ email: values.email });
  };
 
  // ── Success state ────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="bg-white border-4 border-primary p-8 gumroad-shadow space-y-6">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-20 h-20 bg-accent border-4 border-black flex items-center justify-center gumroad-shadow">
            <CheckCircle2 className="size-10" />
          </div>
          <h2 className="text-2xl font-black uppercase italic tracking-tighter">
            Check Your Inbox
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            If an account exists for{" "}
            <strong className="text-primary">{submittedEmail}</strong>, we&apos;ve
            sent a password reset link. It expires in{" "}
            <strong>1 hour</strong>.
          </p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Check your spam folder if you don&apos;t see it.
          </p>
        </div>
      </div>
    );
  }
 
  // ── Form state ───────────────────────────────────────────────
  return (
    <div className="bg-white border-4 border-primary p-8 gumroad-shadow space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-black uppercase italic tracking-tighter">
          Forgot Password?
        </h2>
        <p className="text-sm text-muted-foreground">
          Enter your email and we&apos;ll send you a reset link.
        </p>
      </div>
 
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FormField
            name="email"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-black uppercase text-[10px] tracking-widest text-primary">
                  Email Address
                </FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    {...field}
                    disabled={mutation.isPending}
                    className="booka-input-minimal h-14"
                  />
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
                Sending...
              </>
            ) : (
              <>
                <Mail className="size-4" />
                Send Reset Link
              </>
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}