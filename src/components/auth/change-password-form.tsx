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
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Eye, EyeOff, CheckCircle2 } from "lucide-react";
 
const schema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain at least one uppercase letter")
      .regex(/[0-9]/, "Must contain at least one number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
 
type FormValues = z.infer<typeof schema>;
 
interface ChangePasswordFormProps {
  userId: string;
}
 
export function ChangePasswordForm({ userId }: ChangePasswordFormProps) {
  const { toast } = useToast();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState(false);
 
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });
 
  const mutation = trpc.changePassword.useMutation({
    onSuccess: () => {
      setSuccess(true);
      form.reset();
      toast({
        title: "Password changed",
        description: "Your password has been updated successfully.",
      });
      // Reset success indicator after 4s
      setTimeout(() => setSuccess(false), 4000);
    },
    onError: (err) => {
      if (err.message === "Current password is incorrect.") {
        form.setError("currentPassword", { message: err.message });
      } else {
        toast({
          variant: "destructive",
          title: "Failed to update password",
          description: err.message,
        });
      }
    },
  });
 
  const onSubmit = (values: FormValues) => {
    mutation.mutate({
      userId,
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
    });
  };
 
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-lg font-black uppercase italic tracking-tighter">
          Change Password
        </h3>
        <p className="text-sm text-muted-foreground">
          Update your password. You&apos;ll need your current password to confirm.
        </p>
      </div>
 
      {success && (
        <div className="flex items-center gap-2 bg-accent border-2 border-black p-3">
          <CheckCircle2 className="size-4 shrink-0" />
          <p className="text-[11px] font-black uppercase tracking-widest">
            Password updated successfully
          </p>
        </div>
      )}
 
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Current Password */}
          <FormField
            name="currentPassword"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-black uppercase text-[10px] tracking-widest text-primary">
                  Current Password
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showCurrent ? "text" : "password"}
                      {...field}
                      disabled={mutation.isPending}
                      className="booka-input-minimal h-12 pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent((p) => !p)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-100"
                    >
                      {showCurrent ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
 
          {/* New Password */}
          <FormField
            name="newPassword"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-black uppercase text-[10px] tracking-widest text-primary">
                  New Password
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showNew ? "text" : "password"}
                      {...field}
                      disabled={mutation.isPending}
                      className="booka-input-minimal h-12 pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew((p) => !p)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-100"
                    >
                      {showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
 
          {/* Confirm New Password */}
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
                      className="booka-input-minimal h-12 pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((p) => !p)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-100"
                    >
                      {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
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
            className="booka-button-primary h-12 flex items-center gap-2"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="animate-spin size-4" />
                Updating...
              </>
            ) : (
              "Update Password"
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}