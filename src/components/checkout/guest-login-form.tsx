"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const guestCheckoutLoginSchema = z.object({
  username: z.string().min(1, "Email or username is required"),
  password: z.string().min(1, "Password is required"),
});

export type GuestCheckoutLoginValues = z.infer<typeof guestCheckoutLoginSchema>;

interface GuestLoginFormProps {
  onSubmit: (data: GuestCheckoutLoginValues) => void;
  isLoading?: boolean;
}

export default function GuestLoginForm({
  onSubmit,
  isLoading = false,
}: GuestLoginFormProps) {
  const form = useForm<GuestCheckoutLoginValues>({
    resolver: zodResolver(guestCheckoutLoginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  return (
    <Form {...form}>
      <form
        id="guest-login-form"
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4"
      >
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-700">Email or Username *</FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter your email or username"
                  {...field}
                  className="border-gray-300 rounded-md"
                  disabled={isLoading}
                  required
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-700">Password *</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="Enter your password"
                  {...field}
                  className="border-gray-300 rounded-md"
                  disabled={isLoading}
                  required
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}
