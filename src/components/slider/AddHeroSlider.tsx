"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
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

  const form = useForm<TheroSlideSchema>({
    resolver: zodResolver(heroSlideSchema),
    defaultValues: {
      title: "",
      subtitle: "",
      description: "",
      image: "",
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

  const onSubmit = (values: TheroSlideSchema) => {
    addHeroSlide.mutate(values);
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
                      name="image"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700">
                            Image URL
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter image URL"
                              {...field}
                              className="border-gray-300 rounded-md"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="flex justify-end my-5">
                    <Button
                      disabled={form.formState.isSubmitting}
                      className="bg-blue-600 text-white py-2 px-7 rounded-md"
                      type="submit"
                      data-cy="hero-slide-submit"
                    >
                      Create Slider
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
