"use client";

import type { PutBlobResult } from "@vercel/blob";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useRef } from "react";
import { heroSlideSchema, TheroSlideSchema } from "@/server/dtos";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/components/ui/use-toast";
import { trpc } from "@/app/_providers/trpc-provider";
import { Plus, Upload } from "lucide-react";

const HeroSlideForm = () => {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<TheroSlideSchema>({
    resolver: zodResolver(heroSlideSchema),
    defaultValues: {
      title: "", subtitle: "", description: "",
      image: "", buttonText: "", buttonRoute: "",
    },
  });

  const addHeroSlide = trpc.createHeroSlide.useMutation({
    onSuccess: () => {
      toast({ title: "Slide Created", description: "Hero slide is now live." });
      utils.getAllHeroSlides.invalidate().then(() => {
        setOpen(false);
        form.reset();
      });
    },
    onError: (error) => {
      toast({ title: "Error", variant: "destructive", description: error.message });
    },
  });

  const handleFileUpload = async (file: File): Promise<PutBlobResult> => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch(`/api/avatar/upload?filename=${file.name}`, {
      method: "POST", body: formData,
    });
    if (!response.ok) throw new Error("Failed to upload the file.");
    return response.json();
  };

  const onSubmit = async (values: TheroSlideSchema) => {
    let imageUrl = values.image;
    if (fileInputRef.current?.files?.[0]) {
      setUploading(true);
      try {
        const result = await handleFileUpload(fileInputRef.current.files[0]);
        imageUrl = result.url;
      } catch {
        toast({ title: "Upload Failed", variant: "destructive", description: "Could not upload image." });
        setUploading(false);
        return;
      }
      setUploading(false);
    }
    addHeroSlide.mutate({ ...values, image: imageUrl });
  };

  const fields: { name: keyof TheroSlideSchema; label: string; placeholder: string }[] = [
    { name: "title",       label: "Title",        placeholder: "e.g. Discover African Stories" },
    { name: "subtitle",    label: "Subtitle",     placeholder: "e.g. Curated for you"          },
    { name: "description", label: "Description",  placeholder: "Short supporting text"         },
    { name: "buttonText",  label: "Button Text",  placeholder: "e.g. Shop Now"                 },
    { name: "buttonRoute", label: "Button Route", placeholder: "e.g. /shop"                    },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="booka-button-primary h-12 px-6 text-xs">
          <Plus size={16} className="mr-2" /> Add Slide
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg border-4 border-black rounded-none gumroad-shadow p-0 overflow-hidden max-h-[90vh] flex flex-col">
        <DialogHeader className="p-6 border-b-2 border-black bg-black text-white shrink-0">
          <DialogTitle className="text-xl font-black uppercase italic tracking-tighter text-white">
            New Hero Slide<span className="text-accent">.</span>
          </DialogTitle>
          <p className="text-[10px] font-bold uppercase opacity-50 tracking-widest">
            Global — visible on the main shop homepage
          </p>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 p-6 bg-white">
          <Form {...form}>
            <form id="hero-slide-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {fields.map(({ name, label, placeholder }) => (
                <FormField
                  key={name}
                  control={form.control}
                  name={name}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest">{label}</FormLabel>
                      <FormControl>
                        <Input placeholder={placeholder} {...field} className="input-gumroad" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}

              {/* Image upload */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest">Slide Image</label>
                <label className="flex items-center gap-3 border-2 border-black p-4 cursor-pointer hover:bg-accent/10 transition-colors">
                  <Upload size={16} className="shrink-0 opacity-50" />
                  <span className="text-xs font-bold opacity-50">
                    {fileInputRef.current?.files?.[0]?.name ?? "Click to upload image"}
                  </span>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={() => form.trigger("image")}
                  />
                </label>
              </div>
            </form>
          </Form>
        </div>

        <div className="p-6 border-t-2 border-black bg-gray-50 flex justify-end gap-3 shrink-0">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="rounded-none border-2 border-black font-black uppercase text-xs h-11 px-6"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="hero-slide-form"
            disabled={form.formState.isSubmitting || uploading || addHeroSlide.isPending}
            className="booka-button-primary h-11 px-8 text-xs"
          >
            {uploading ? "Uploading…" : addHeroSlide.isPending ? "Saving…" : "Create Slide"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HeroSlideForm;