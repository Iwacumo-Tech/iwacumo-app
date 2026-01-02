"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signUpSchema, TSignUpSchema } from "@/server/dtos";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { trpc } from "@/app/_providers/trpc-provider";
import { useToast } from "@/components/ui/use-toast";
import { signIn } from "next-auth/react";
import { Loader2 } from "lucide-react"; // Loader icon

export function RegisterForm() {
  const { toast } = useToast();
  const form = useForm<TSignUpSchema>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { first_name: "", last_name: "", email: "", username: "", password: "" },
  });

  const signup = trpc.signUpCustomer.useMutation({
    onSuccess: async (_, variables) => {
      toast({ title: "Welcome to Booka!", description: "Account created successfully." });
      
      const result = await signIn("credentials", {
        username: variables.username,
        password: variables.password,
        callbackUrl: "/",
        redirect: true,
      });
    },
    onError: (err) => {
      toast({ variant: "destructive", title: "Signup failed", description: err.message });
    }
  });

  const isSubmitting = signup.isPending || signup.isLoading;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((vals) => signup.mutate(vals))} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="first_name" render={({ field }) => (
            <FormItem><FormLabel>First Name</FormLabel><FormControl><Input placeholder="John" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="last_name" render={({ field }) => (
            <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input placeholder="Doe" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <FormField control={form.control} name="username" render={({ field }) => (
          <FormItem><FormLabel>Username</FormLabel><FormControl><Input placeholder="johndoe" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="email" render={({ field }) => (
          <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="john@example.com" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="password" render={({ field }) => (
          <FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        
        <Button 
          type="submit" 
          className="w-full" 
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating Account...
            </span>
          ) : (
            "Create Account"
          )}
        </Button>
      </form>
    </Form>
  );
}