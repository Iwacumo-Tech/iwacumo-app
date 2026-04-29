"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updatePublisherSchema, TupdatePublisherSchema } from "@/server/dtos";
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
import { useState, useRef, useEffect } from "react";
import { uploadImage } from "@/lib/server";

interface PublisherFormProps {
  publisher?: Publisher;
  action: "Edit";
}

export const EditPublisherForm = ({ publisher, action }: PublisherFormProps) => {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const { data: tenants } = trpc.getAllTenant.useQuery();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File): Promise<string> => {
    return uploadImage(file, { category: "image", purpose: "publisher-profiles" });
  };

  const form = useForm<TupdatePublisherSchema>({
    resolver: zodResolver(updatePublisherSchema),
    defaultValues: {
      id: publisher?.id,
      custom_domain: publisher?.custom_domain ?? "",
      bio: publisher?.bio ?? "",
      profile_picture: publisher?.profile_picture ?? "",
      slug: publisher?.slug ?? "",
      tenant_id: publisher?.tenant_id ?? "",
    },
  });

  useEffect(() => {
    console.log("Form State Updated:", form.formState);
  }, [form.formState]);

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

  const onSubmit = async (values: TupdatePublisherSchema) => {
    console.log("Form Values:", values);
    let imageUrl = values.profile_picture; // Default to the existing value (if any)
    if (fileInputRef.current?.files && fileInputRef.current.files[0]) {
      const file = fileInputRef.current.files[0];
      try {
        const uploadResult = await handleFileUpload(file); // Upload the image
        imageUrl = uploadResult; // Get the URL from the upload response
      } catch (error) {
        toast({
          title: "Error",
          variant: "destructive",
          description: error instanceof Error ? error.message : "Failed to upload the image.",
        });
        return; // Stop form submission if image upload fails
      }
    }

    if (publisher?.id) {
      updatePublisher.mutate({
        ...values,
        id: publisher.id,
        profile_picture: imageUrl,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="w-full">
          Edit Publisher
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto space-y-3">
        <DialogHeader>
          <DialogTitle>Edit Publisher</DialogTitle>
        </DialogHeader>
        <Card>
          <CardHeader>
            <CardTitle>Publisher Details</CardTitle>
            <CardDescription>
              Update the publisher information here.
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
                    {/* Publisher-specific fields */}
                    <FormField
                      control={form.control}
                      name="custom_domain"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Custom Domain</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Enter custom domain"
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
                              value={field.value ?? ""}
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
                              value={field.value ?? ""}
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
                      Save Changes
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

export default EditPublisherForm;
