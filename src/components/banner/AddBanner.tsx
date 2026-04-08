"use client";

import type { PutBlobResult } from "@vercel/blob";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useRef } from "react";
import { createBannerSchema, TcreateBannerSchema } from "@/server/dtos";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form, FormItem, FormLabel, FormControl, FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/components/ui/use-toast";
import { trpc } from "@/app/_providers/trpc-provider";
import { Plus, Upload, ImageIcon } from "lucide-react";

const CreateBannerForm = () => {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<TcreateBannerSchema>({
    resolver: zodResolver(createBannerSchema),
    defaultValues: { image: "" },
  });

  const createBannerMutation = trpc.createBanner.useMutation({
    onSuccess: () => {
      toast({ title: "Banner Created", description: "Banner is now live." });
      utils.getAllBanners.invalidate().then(() => {
        setOpen(false);
        setPreview(null);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setPreview(URL.createObjectURL(file));
  };

  const onSubmit = async () => {
    if (!fileInputRef.current?.files?.[0]) {
      toast({ title: "No image selected", variant: "destructive", description: "Please select a banner image." });
      return;
    }
    setUploading(true);
    try {
      const result = await handleFileUpload(fileInputRef.current.files[0]);
      createBannerMutation.mutate({ image: result.url });
    } catch {
      toast({ title: "Upload Failed", variant: "destructive", description: "Could not upload image." });
    }
    setUploading(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setPreview(null); }}>
      <DialogTrigger asChild>
        <Button className="booka-button-primary h-12 px-6 text-xs">
          <Plus size={16} className="mr-2" /> Add Banner
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg border-4 border-black rounded-none gumroad-shadow p-0 overflow-hidden">
        <DialogHeader className="p-6 border-b-2 border-black bg-black text-white">
          <DialogTitle className="text-xl font-black uppercase italic tracking-tighter text-white">
            New Banner<span className="text-accent">.</span>
          </DialogTitle>
          <p className="text-[10px] font-bold uppercase opacity-50 tracking-widest">
            Global — visible on the main shop homepage
          </p>
        </DialogHeader>

        <div className="p-6 bg-white space-y-5">
          {/* Image preview */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="relative w-full h-40 border-4 border-dashed border-black cursor-pointer hover:bg-accent/5 transition-colors flex items-center justify-center overflow-hidden"
          >
            {preview
              ? <img src={preview} alt="Preview" className="w-full h-full object-cover" />
              : (
                <div className="flex flex-col items-center gap-2 opacity-30">
                  <ImageIcon size={32} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Click to select image</span>
                </div>
              )
            }
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {fileInputRef.current?.files?.[0] && (
            <p className="text-[10px] font-bold opacity-50 truncate">
              {fileInputRef.current.files[0].name}
            </p>
          )}
        </div>

        <div className="p-6 border-t-2 border-black bg-gray-50 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="rounded-none border-2 border-black font-black uppercase text-xs h-11 px-6"
          >
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            disabled={uploading || createBannerMutation.isPending}
            className="booka-button-primary h-11 px-8 text-xs"
          >
            {uploading ? "Uploading…" : createBannerMutation.isPending ? "Saving…" : "Upload Banner"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateBannerForm;