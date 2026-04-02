"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/app/_providers/trpc-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Plus, Pencil } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────
type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
};

interface CategoryFormProps {
  category?: CategoryRow; // if provided → Edit mode
}

// ── Schema ────────────────────────────────────────────────────
const schema = z.object({
  name:        z.string().min(1, "Name is required").max(80),
  slug:        z.string().optional(),
  description: z.string().max(500).optional(),
  icon:        z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

// ── Component ─────────────────────────────────────────────────
export function CategoryForm({ category }: CategoryFormProps) {
  const isEdit = !!category;
  const { toast } = useToast();
  const utils     = trpc.useUtils();
  const [open, setOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name:        category?.name        ?? "",
      slug:        category?.slug        ?? "",
      description: category?.description ?? "",
      icon:        category?.icon        ?? "",
    },
  });

  // Auto-generate slug from name while slug field is empty / untouched
  const watchedName = form.watch("name");
  const watchedSlug = form.watch("slug");
  const slugIsPristine =
    !isEdit && (!watchedSlug || watchedSlug === toSlug(watchedName));

  function toSlug(str: string) {
    return str.toLowerCase().trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }

  const invalidate = () => utils.getAllCategories.invalidate();

  const createMutation = trpc.createCategory.useMutation({
    onSuccess: () => {
      toast({ title: "Category created." });
      invalidate();
      setOpen(false);
      form.reset();
    },
    onError: (err) =>
      toast({ variant: "destructive", title: "Failed", description: err.message }),
  });

  const updateMutation = trpc.updateCategory.useMutation({
    onSuccess: () => {
      toast({ title: "Category updated." });
      invalidate();
      setOpen(false);
    },
    onError: (err) =>
      toast({ variant: "destructive", title: "Failed", description: err.message }),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (values: FormValues) => {
    const slug = values.slug ? values.slug : toSlug(values.name);
    if (isEdit) {
      updateMutation.mutate({ id: category.id, ...values, slug });
    } else {
      createMutation.mutate({ ...values, slug });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) form.reset({ name: category?.name ?? "", slug: category?.slug ?? "", description: category?.description ?? "", icon: category?.icon ?? "" }); }}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button size="sm" variant="ghost"
            className="h-8 w-8 p-0 hover:bg-accent border border-transparent hover:border-black">
            <Pencil className="size-4" />
          </Button>
        ) : (
          <Button className="booka-button-primary gap-2 h-12">
            <Plus className="size-4" />
            New Category
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-black uppercase italic tracking-tighter text-xl">
            {isEdit ? "Edit Category" : "New Category"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 pt-2">

            {/* Name */}
            <FormField name="name" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel className="font-black uppercase text-[10px] tracking-widest">
                  Name
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    disabled={isPending}
                    className="booka-input-minimal h-12"
                    placeholder="e.g. African Fiction"
                    onChange={(e) => {
                      field.onChange(e);
                      if (slugIsPristine) {
                        form.setValue("slug", toSlug(e.target.value));
                      }
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Slug */}
            <FormField name="slug" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel className="font-black uppercase text-[10px] tracking-widest">
                  Slug
                  <span className="ml-2 font-normal normal-case opacity-40 text-[10px]">
                    auto-generated from name
                  </span>
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    disabled={isPending}
                    className="booka-input-minimal h-12 font-mono text-sm"
                    placeholder="african-fiction"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Icon */}
            <FormField name="icon" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel className="font-black uppercase text-[10px] tracking-widest">
                  Icon
                  <span className="ml-2 font-normal normal-case opacity-40 text-[10px]">
                    emoji or icon name
                  </span>
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    disabled={isPending}
                    className="booka-input-minimal h-12"
                    placeholder="📚 or book-open"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Description */}
            <FormField name="description" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel className="font-black uppercase text-[10px] tracking-widest">
                  Description
                  <span className="ml-2 font-normal normal-case opacity-40 text-[10px]">
                    optional
                  </span>
                </FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    disabled={isPending}
                    className="booka-input-minimal min-h-[80px] resize-none"
                    placeholder="A short description of this category..."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <Button type="submit" disabled={isPending}
              className="w-full booka-button-primary h-12 flex items-center justify-center gap-2">
              {isPending
                ? <><Loader2 className="animate-spin size-4" />{isEdit ? "Saving..." : "Creating..."}</>
                : isEdit ? "Save Changes" : "Create Category"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}