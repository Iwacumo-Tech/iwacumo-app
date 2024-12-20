"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createPublisherSchema, TCreatePublisherSchema } from "@/server/dtos"; // You will need to define this schema
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Publisher } from "@prisma/client";
import { useSession } from "next-auth/react";
import type { PutBlobResult } from "@vercel/blob";
import { useState, useRef } from "react";

interface PublisherFormProps {
  publisher?: Publisher;
  action: "Add" | "Edit";
}

const PublisherForm = ({ publisher, action }: PublisherFormProps) => {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const session = useSession();
  const { data: tenants } = trpc.getAllTenant.useQuery();
  const { data: users } = trpc.getAllUsers.useQuery();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File): Promise<PutBlobResult> => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`/api/avatar/upload?filename=${file.name}`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("File upload response error:", error);
      throw new Error("Failed to upload the file.");
    }

    const result = await response.json();
    return result as PutBlobResult;
  };

  const form = useForm<TCreatePublisherSchema>({
    resolver: zodResolver(createPublisherSchema),
    defaultValues: {
      custom_domain: publisher?.custom_domain ?? "",
      bio: publisher?.bio ?? "",
      profile_picture: publisher?.profile_picture ?? "",
      slug: publisher?.slug ?? "",
      tenant_id: publisher?.tenant_id ?? "",
      user_id: publisher?.user_id ?? "",
    },
  });

  const addPublisher = trpc.createPublisher.useMutation({
    onSuccess: async () => {
      toast({
        title: "Success",
        variant: "default",
        description: "Successfully added a new publisher",
      });

      utils.getAllPublisher.invalidate();
    },
    onError: (error) => {
      console.error(error);

      toast({
        title: "Error",
        variant: "destructive",
        description: "Error adding the publisher",
      });
    },
  });

  const updatePublisher = trpc.updatePublisher.useMutation({
    onSuccess: async () => {
      toast({
        title: "Success",
        variant: "default",
        description: "Successfully updated the publisher",
      });

      utils.getAllPublisher.invalidate().then(() => {
        setOpen(false);
      });
    },
    onError: (error) => {
      console.error(error);

      toast({
        title: "Error",
        variant: "destructive",
        description: "Error updating the publisher",
      });
    },
  });

  const onSubmit = async (values: TCreatePublisherSchema) => {
    let imageUrl = values.profile_picture; // Default to the existing value (if any)
    if (fileInputRef.current?.files && fileInputRef.current.files[0]) {
      const file = fileInputRef.current.files[0];
      try {
        console.log("Uploading image...");
        const uploadResult = await handleFileUpload(file); // Upload the image
        imageUrl = uploadResult.url; // Get the URL from the upload response
        console.log("Image uploaded successfully:", imageUrl);
      } catch (error) {
        toast({
          title: "Error",
          variant: "destructive",
          description: "Failed to upload the image.",
        });
        return; // Stop form submission if image upload fails
      }
    }

    console.log("Final form data before mutation:", {
      ...values,
      image: imageUrl,
    });

    if (publisher?.id) {
      updatePublisher.mutate({
        ...values,
        id: publisher.id,
        profile_picture: imageUrl,
      });
    } else {
      addPublisher.mutate({ ...values, profile_picture: imageUrl });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className={`${action === "Edit" ? "w-full" : ""}`}>
          {action} Publisher
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto space-y-3">
        <DialogHeader>
          <DialogTitle>{action} Publisher</DialogTitle>
        </DialogHeader>
        <Card>
          <CardHeader>
            <CardTitle>Publisher Details</CardTitle>
            <CardDescription>
              Make changes to the publisher information here.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <fieldset disabled={form.formState.isSubmitting}>
                  <div className="grid gap-6">
                    <FormField
                      control={form.control}
                      name="tenant_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Select Organization</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl className="mt-1">
                              <SelectTrigger>
                                <SelectValue placeholder="Select Organization" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {tenants?.map((tenant) => (
                                <SelectItem
                                  role="option"
                                  key={tenant.id}
                                  value={tenant.id}
                                >
                                  {tenant.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="user_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Select User</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl className="mt-1">
                              <SelectTrigger>
                                <SelectValue placeholder="Select User" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {users?.map((user) => (
                                <SelectItem
                                  role="option"
                                  key={user.id}
                                  value={user.id}
                                >
                                  {user.first_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="custom_domain"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700">
                            Custom Domain
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter custom domain"
                              {...field}
                              className="border-gray-300 rounded-md"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="bio"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700">Bio</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter publisher bio"
                              {...field}
                              className="border-gray-300 rounded-md"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="slug"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700">Slug</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter publisher slug"
                              {...field}
                              className="border-gray-300 rounded-md"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="space-y-1">
                      <FormItem>
                        <FormLabel className="text-gray-700">
                          Profile Picture
                        </FormLabel>
                        <br />
                        <FormControl>
                          <input
                            type="file"
                            ref={fileInputRef}
                            className="border-gray-300 rounded-md p-2"
                          />
                        </FormControl>
                      </FormItem>
                    </div>
                  </div>
                  <div className="flex justify-end my-5">
                    <Button
                      disabled={form.formState.isSubmitting}
                      className="bg-blue-600 text-white py-2 px-7 rounded-md"
                      type="submit"
                      data-cy="publisher-submit"
                    >
                      {action === "Add" ? "Proceed" : "Save Changes"}
                    </Button>
                  </div>
                </fieldset>
              </form>
            </Form>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
};

export default PublisherForm;
