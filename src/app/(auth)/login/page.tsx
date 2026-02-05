"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/components/ui/use-toast";
import Link from "next/link";
import { Loader2 } from "lucide-react"; // Import a loader icon

const loginSchema = z.object({
  username: z.string().min(1, "Email or Username is required"),
  password: z.string().min(1, "Password is required"),
});

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  // Extract isSubmitting from formState
  const { isSubmitting } = form.formState;

  const onSubmit = async (values: z.infer<typeof loginSchema>) => {
    const res = await signIn("credentials", { ...values, redirect: false });
    
    if (res?.error) {
      toast({ 
        title: "Login failed", 
        variant: "destructive", 
        description: "Invalid credentials." 
      });
    } else {
      toast({ title: "Welcome back!", description: "Redirecting to dashboard..." });
      router.push("/app");
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-5xl font-black uppercase italic tracking-tighter mb-2">
            Booka<span className="text-accent">.</span>
          </h1>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground">
            Sign in to your library
          </p>
        </div>

        <div className="bg-white border-4 border-primary p-8 gumroad-shadow">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                name="username"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-black uppercase text-[10px] tracking-widest text-primary">
                      Username / Email
                    </FormLabel>
                    <FormControl>
                      <Input {...field} disabled={isSubmitting} className="booka-input-minimal h-14" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name="password"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-black uppercase text-[10px] tracking-widest text-primary">
                      Password
                    </FormLabel>
                    <FormControl>
                      <Input type="password" disabled={isSubmitting} {...field} className="booka-input-minimal h-14" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="submit" 
                disabled={isSubmitting} 
                className="w-full booka-button-primary h-16 text-lg flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin h-5 w-5" />
                    Authenticating...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </Form>
        </div>

        <div className="text-center space-y-4">
          <Link href="/forgot-password" title="Recover account" className="text-[10px] text-sm font-black uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity">
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