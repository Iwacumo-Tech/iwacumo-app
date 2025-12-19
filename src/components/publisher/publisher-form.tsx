"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  createPublisherSchema, 
  updatePublisherSchema,
  TCreatePublisherSchema,
  TupdatePublisherSchema 
} from "@/server/dtos";
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

interface PublisherFormProps {
  publisher?: Publisher;
  action: "Add" | "Edit";
}

const PublisherForm = ({ publisher, action }: PublisherFormProps) => {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const { data: tenants } = trpc.getAllTenant.useQuery();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File): Promise<string> => {
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
    return result.url;
  };

  const isEditMode = action === "Edit" && publisher?.id;

  const form = useForm<TCreatePublisherSchema | TupdatePublisherSchema>({
    resolver: zodResolver(isEditMode ? updatePublisherSchema : createPublisherSchema),
    defaultValues: isEditMode
      ? {
          id: publisher.id,
          custom_domain: publisher?.custom_domain ?? "",
          bio: publisher?.bio ?? "",
          profile_picture: publisher?.profile_picture ?? "",
          slug: publisher?.slug ?? "",
          tenant_id: publisher?.tenant_id ?? "",
        }
      : {
          custom_domain: "",
          bio: "",
          profile_picture: "",
          slug: "",
          tenant_id: "",
          tenant_name: "",
          email: "",
          password: "",
          first_name: "",
          last_name: "",
          phone_number: "",
          date_of_birth: undefined,
          username: "",
        },
  });


  const addPublisher = trpc.createPublisher.useMutation({
    onSuccess: async () => {
      toast({
        title: "Success",
        variant: "default",
        description: "Successfully added a new publisher",
      });

      await Promise.all([
        utils.getAllPublisher.invalidate(),
        utils.getPublisherByOrganization.invalidate(),
      ]);
      setOpen(false);
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

      await Promise.all([
        utils.getAllPublisher.invalidate(),
        utils.getPublisherByOrganization.invalidate(),
      ]);
      setOpen(false);
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

  const onSubmit = async (values: TCreatePublisherSchema | TupdatePublisherSchema) => {
    let imageUrl = values.profile_picture ?? ""; // Default to the existing value (if any)
    if (fileInputRef.current?.files && fileInputRef.current.files[0]) {
      const file = fileInputRef.current.files[0];
      try {
        const uploadResult = await handleFileUpload(file); // Upload the image
        imageUrl = uploadResult; // Get the URL from the upload response
      } catch (error) {
        toast({
          title: "Error",
          variant: "destructive",
          description: "Failed to upload the image.",
        });
        return; // Stop form submission if image upload fails
      }
    }

    if (isEditMode) {
      const updateValues = values as TupdatePublisherSchema;
      updatePublisher.mutate({
        id: publisher!.id,
        bio: updateValues.bio ?? null,
        custom_domain: updateValues.custom_domain ?? "",
        profile_picture: imageUrl,
        tenant_id: updateValues.tenant_id,
        slug: updateValues.slug ?? null,
      });
    } else {
      const createValues = values as TCreatePublisherSchema;
      addPublisher.mutate({
        ...createValues,
        profile_picture: imageUrl,
        date_of_birth: createValues.date_of_birth
          ? new Date(createValues.date_of_birth)
          : undefined,
      });
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
                    {!isEditMode && (
                      <FormField
                        control={form.control}
                        name="tenant_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Or enter new Organization name</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="e.g., New Organization Inc."
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    {/* User creation fields - only show when creating */}
                    {!isEditMode && (
                      <>
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Enter email" />
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
                              <FormLabel>Password</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="Enter password"
                                  type="password"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="first_name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>First Name</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Enter first name" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="last_name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Last Name</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Enter last name" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Username</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Enter username" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="phone_number"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone Number</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="Enter phone number"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="date_of_birth"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Date of Birth</FormLabel>
                              <FormControl>
                                <Input
                                  type="date"
                                  {...field}
                                  value={
                                    field.value
                                      ? field.value.toISOString().split("T")[0]
                                      : ""
                                  } // Format Date to YYYY-MM-DD
                                  onChange={(e) =>
                                    field.onChange(
                                      e.target.value
                                        ? new Date(e.target.value)
                                        : undefined
                                    )
                                  } // Convert string to Date
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}
                    {/* Publisher fields */}
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
                      render={({ field }) => {
                        const { value, ...rest } = field;
                        return (
                          <FormItem>
                            <FormLabel className="text-gray-700">Bio</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter publisher bio"
                                {...rest}
                                value={(value ?? "") as string}
                                className="border-gray-300 rounded-md"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                    <FormField
                      control={form.control}
                      name="slug"
                      render={({ field }) => {
                        const { value, ...rest } = field;
                        return (
                          <FormItem>
                            <FormLabel className="text-gray-700">Slug</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter publisher slug"
                                {...rest}
                                value={(value ?? "") as string}
                                className="border-gray-300 rounded-md"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
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
