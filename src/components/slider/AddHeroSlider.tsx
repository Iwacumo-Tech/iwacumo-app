"use client";

import type { PutBlobResult } from "@vercel/blob"; // Importing the correct type for blob result
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useRef } from "react";
import { heroSlideSchema, TheroSlideSchema } from "@/server/dtos";
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

const HeroSlideForm = () => {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null); // Ref for file input

  const form = useForm<TheroSlideSchema>({
    resolver: zodResolver(heroSlideSchema),
    defaultValues: {
      title: "",
      subtitle: "",
      description: "",
      image: "",
      buttonText: "",
      buttonRoute: "",
    },
  });

  const addHeroSlide = trpc.createHeroSlide.useMutation({
    onSuccess: async () => {
      toast({
        title: "Success",
        variant: "default",
        description: "Successfully created a Hero Slider",
      });

      utils.getAllHeroSlides.invalidate().then(() => {
        setOpen(false);
        form.reset();
      });
    },
    onError: (error) => {
      console.error(error);

      toast({
        title: "Error",
        variant: "destructive",
        description: "Error creating Hero Slide",
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

  const onSubmit = async (values: TheroSlideSchema) => {
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

    // Save the form data along with the image URL to the database
    addHeroSlide.mutate({
      ...values,
      image: imageUrl, // Pass the image URL
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Add Hero Slider</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto space-y-3">
        <DialogHeader>
          <DialogTitle>Add Hero Slider</DialogTitle>
        </DialogHeader>
        <Card>
          <CardHeader>
            <CardTitle>Hero Slider Details</CardTitle>
            <CardDescription>
              Fill in the details for your hero slider below.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <fieldset disabled={form.formState.isSubmitting}>
                  <div className="grid gap-6">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700">Title</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter slide title"
                              {...field}
                              className="border-gray-300 rounded-md"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="space-y-1">
                    <FormField
                      control={form.control}
                      name="subtitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700">
                            Subtitle
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter slide subtitle"
                              {...field}
                              className="border-gray-300 rounded-md"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid gap-6">
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700">
                            Description
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter slide description"
                              {...field}
                              className="border-gray-300 rounded-md"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="space-y-1">
                    <FormField
                      control={form.control}
                      name="buttonText"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700">
                            Button Text
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter text for button"
                              {...field}
                              className="border-gray-300 rounded-md"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="space-y-1">
                    <FormField
                      control={form.control}
                      name="buttonRoute"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700">
                            Button Route
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter route for button"
                              {...field}
                              className="border-gray-300 rounded-md"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
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
                    </FormItem>
                  </div>

                  <div className="flex justify-end my-5">
                    <Button
                      disabled={form.formState.isSubmitting}
                      className="bg-blue-600 text-white py-2 px-7 rounded-md"
                      type="submit"
                      data-cy="hero-slide-submit"
                    >
                      {form.formState.isSubmitting
                        ? "Submitting..."
                        : "Create Slider"}
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

export default HeroSlideForm;
