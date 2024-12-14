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
import SignUpOption from "./signup-option";

export default function LoginForm () {
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

  async function onSubmit (values: LoginFormInput) {
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
          title: "Login failed.", // TODO: Translate text
          description: "Session not created.",
        });

        return;
      }

      console.log("Session Permissions:", session.permissions);

      slug =
        slug ||
        session?.permissions.find(
          ({ resource_id }) => !!resource_id
        )?.resource_id ||
        null;

      if (!checkPermission(slug, session.permissions)) {
        toast({
          variant: "destructive",
          title: "Authorization failed.",
          description: "You are not in any organization",
        });

        return;
      }

      toast({ description: "Logged in successfully" });

      const { permissions } = session;

      if (permissions) {
        router.push("/app");
      }
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
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <fieldset disabled={form.formState.isSubmitting}>
          <FormField
            name="username"
            control={form.control}
            render={({ field }) => (
              <FormItem className="mb-3">
                <FormControl>
                  <Input placeholder="Email or Username" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            name="password"
            control={form.control}
            render={({ field }) => (
              <FormItem className="mb-3">
                <FormControl>
                  <Input placeholder="Password" type="password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit">Login</Button>
        </fieldset>
        <div>
          <p>
            Dont have an Account?
            <SignUpOption />
          </p>
        </div>
      </form>
    </Form>
  );
}
