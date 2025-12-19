"use client";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { loginFormSchema } from "@/lib/dtos";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { signIn, getSession } from "next-auth/react";
import { useToast } from "@/components/ui/use-toast";
import { useRouter, useSearchParams } from "next/navigation";
import { z } from "zod";
import { checkPermission } from "@/lib/server";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import SignUpOption from "./signup-option";

export default function LoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  let slug = searchParams.get("slug");

  type LoginFormInput = z.infer<typeof loginFormSchema>;

  const form = useForm<LoginFormInput>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  async function onSubmit(values: LoginFormInput) {
    try {
      const res = await signIn("credentials", { ...values, redirect: false });

      if (!res || res.error) {
        toast({
          variant: "destructive",
          title: "Login failed",
          description: "Check your login credentials.",
        });
        return;
      }

      const session = await getSession();

      if (!session) {
        toast({
          variant: "destructive",
          title: "Login failed.",
          description: "Session not created.",
        });
        return;
      }

      console.log("Session Permissions:", session.permissions);
      console.log("Session Roles:", session.roles);
      console.log("Session Tenant Slug:", session.tenantSlug);
      console.log(session);

      // Get tenant_slug from permissions (resource_id) or from session.tenantSlug (from ROLE claims)
      slug =
        slug ||
        session?.permissions.find(({ resource_id }) => !!resource_id)
          ?.resource_id ||
        session?.tenantSlug ||
        null;

      // Check if user has permission OR if they have a tenant_slug from role claims
      const hasPermission = checkPermission(slug, session.permissions);
      const hasTenantSlug = !!session.tenantSlug || !!slug;

      if (!hasPermission && !hasTenantSlug) {
        toast({
          variant: "destructive",
          title: "Authorization failed.",
          description: "You are not in any organization",
        });
        return;
      }

      toast({ description: "Logged in successfully" });
      router.push("/");

      const { permissions } = session;

      // if (permissions) {
      //   router.push("/app");
      // }
    } catch (error) {
      console.warn(error);
      toast({
        variant: "destructive",
        title: "Login failed",
        description: "Something went wrong.",
      });
      return;
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto overflow-hidden">
      <CardHeader className="bg-[#82d236] p-6">
        <h2 className="text-xl font-semibold text-white text-center">
          Sign In
        </h2>
      </CardHeader>
      <CardContent className="px-6 py-10 space-y-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <fieldset disabled={form.formState.isSubmitting}>
              <FormField
                name="username"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        placeholder="Email or Username"
                        {...field}
                        className="bg-gray-100 border-0 rounded-full px-4"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name="password"
                control={form.control}
                render={({ field }) => (
                  <FormItem className="mt-3">
                    <FormControl>
                      <Input
                        placeholder="Password"
                        type="password"
                        {...field}
                        className="bg-gray-100 border-0 rounded-full px-4"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="text-right mt-2">
                <Link
                  href="/forgot-password"
                  className="text-sm text-gray-500 hover:text-[#82d236]"
                >
                  Forgot Username / Password?
                </Link>
              </div>
              <Button
                type="submit"
                className="w-full mt-4 bg-[#82d236] hover:bg-[#72bc2d] text-white rounded-full"
              >
                SIGN IN
              </Button>
            </fieldset>
          </form>
        </Form>
        <div className="text-center space-y-2  py-8">
          <p className="text-gray-500">Don&apos;t have an account?</p>
          <SignUpOption />
        </div>
      </CardContent>
    </Card>
  );
}
