"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import { trpc } from "@/app/_providers/trpc-provider";
import { useState } from "react";
import { signUpAuthorSchema, TSignUpAuthorSchema } from "@/server/dtos";

const AuthorSignUpForm = () => {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [, setOpen] = useState(false);

  const form = useForm({
    resolver: zodResolver(signUpAuthorSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      slug: "",
      phone_number: "",
      password: "",
    },
  });

  const addUserMutation = trpc.signUpAuthor.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Account successfully created.",
      });

      utils.getAllUsers.invalidate().then(() => {
        setOpen(false);
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const { control, handleSubmit } = form;

  const onSubmit = (values: TSignUpAuthorSchema) => {
    addUserMutation.mutate(values);
  };

  return (

    <div className="w-full max-w-lg mx-auto p-8 bg-white shadow-md rounded-md">
      <h2 className="text-2xl font-bold text-center mb-6">Author Sign Up</h2>
      <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={control}
            name="first_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Enter First Name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="last_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Enter Last Name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="phone_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Enter Phone Number" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="slug"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Slug</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Enter user slug" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Enter Email" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input {...field} type="password" placeholder="Enter Password" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-4"
            type="submit"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? "Loading..." : "Sign Up"}
          </Button>
        </form>
      </Form>
    </div>

  );
};

export default AuthorSignUpForm;
