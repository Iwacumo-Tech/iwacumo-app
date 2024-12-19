"use client";

import type { PutBlobResult } from "@vercel/blob"; // Importing the correct type for blob result
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useRef } from "react";
import { createBannerSchema, TcreateBannerSchema } from "@/server/dtos";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

const CreateBannerForm = () => {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null); 

  const form = useForm<TcreateBannerSchema>({
    resolver: zodResolver(createBannerSchema),
    defaultValues: {
      image: "",
    },
  });

  const createBanner = trpc.createBanner.useMutation({
    onSuccess: async () => {
      toast({
        title: "Success",
        variant: "default",
        description: "Successfully created a Banner",
      });

      utils.getAllBanners.invalidate().then(() => {
        setOpen(false);
        form.reset();
      });
    },
    onError: (error) => {
      console.error(error);

      toast({
        title: "Error",
        variant: "destructive",
        description: "Error creating Banner",
      });
    },
  });

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

  const onSubmit = async (values: TcreateBannerSchema) => {
    console.log("Form values before submission:", values);

    // Upload the file if it's selected
    let imageUrl = values.image; // Default to the existing value (if any)
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
      image: imageUrl, // Attach the uploaded image URL
    });

    // Save the banner data along with the image URL to the database
    createBanner.mutate({
      image: imageUrl, // Pass the image URL
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Add Banner</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto space-y-3">
        <DialogHeader>
          <DialogTitle>Add Banner</DialogTitle>
        </DialogHeader>
        <Card>
          <CardHeader>
            <CardTitle>Banner Details</CardTitle>
            <CardDescription>
              Upload an image for your banner below.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <fieldset disabled={form.formState.isSubmitting}>
                  <div className="space-y-1">
                    <FormItem>
                      <FormLabel className="text-gray-700">Image</FormLabel>
                      <br />
                      <FormControl>
                        <input
                          type="file"
                          ref={fileInputRef}
                          className="border-gray-300 rounded-md p-2"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  </div>

                  <div className="flex justify-end my-5">
                    <Button
                      disabled={form.formState.isSubmitting}
                      className="bg-blue-600 text-white py-2 px-7 rounded-md"
                      type="submit"
                      data-cy="banner-submit"
                    >
                      {form.formState.isSubmitting
                        ? "Submitting..."
                        : "Create Banner"}
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

export default CreateBannerForm;
