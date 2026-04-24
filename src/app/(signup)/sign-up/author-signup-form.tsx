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
import { Eye, EyeOff } from "lucide-react";

const AuthorSignUpForm = () => {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [, setOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm({
    resolver: zodResolver(signUpAuthorSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      pen_name: "",
      email: "",
      slug: "",
      phone_number: "",
      password: "",
      confirm_password: "",
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

  const onSubmit = (values: TSignUpAuthorSchema & { confirm_password?: string }) => {
    if (values.password !== values.confirm_password) {
      toast({
        title: "Passwords do not match",
        description: "Please make sure both password fields are the same.",
        variant: "destructive",
      });
      return;
    }
    const { confirm_password, ...payload } = values;
    addUserMutation.mutate(payload);
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
                  <div className="relative">
                    <Input {...field} type={showPassword ? "text" : "password"} placeholder="Enter Password" className="pr-12" />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-black/50 hover:text-black"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="pen_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pen Name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Optional pen name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name={"confirm_password" as never}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input {...field} type={showConfirmPassword ? "text" : "password"} placeholder="Confirm Password" className="pr-12" />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((value) => !value)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-black/50 hover:text-black"
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
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
