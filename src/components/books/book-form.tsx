"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useMemo } from "react";
import { createBookSchema, TCreateBookSchema } from "@/server/dtos";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/components/ui/use-toast";
import { trpc } from "@/app/_providers/trpc-provider";
import { Book } from "@prisma/client";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import axios from "axios";
import { Loader2, CheckCircle2, UploadCloud, Edit3 } from "lucide-react";

interface BookFormProps {
  book?: Book;
  action: "Add" | "Edit";
  trigger?: React.ReactNode;
}

const BookForm = ({ book, action, trigger }: BookFormProps) => {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  // const { data: session } = useSession();
  const session = useSession();

  const sessionAuthorId = (session.data?.user as any)?.author_id;
  
  const { data: authors } = trpc.getAuthorsByUser.useQuery({
    id: session.data?.user.id as string,
  }, {
    // Only fetch authors list if the logged-in user is NOT an author (e.g., a Publisher)
    enabled: !!session.data?.user.id && !sessionAuthorId
  });

  const { data: categories } = trpc.getCategories.useQuery();

  // Extract initial prices from variants or legacy price field
  const initialPrices = useMemo(() => {
    if (book && (book as any).variants) {
      const variants = (book as any).variants || [];
      const prices: { paperback?: number; hardcover?: number; ebook?: number } = {};
      variants.forEach((variant: any) => {
        if (variant.format === "paperback") prices.paperback = variant.list_price;
        if (variant.format === "ebook") prices.ebook = variant.list_price;
        if (variant.format === "hardcover") prices.hardcover = variant.list_price;
      });
      return prices;
    }
    return { 
      paperback: (book as any)?.price || 0, 
      ebook: (book as any)?.price || 0, 
      hardcover: (book as any)?.price || 0 
    };
  }, [book]);

  // Comprehensive Upload State mapped to Prisma fields
  const [uploads, setUploads] = useState({
    front: { progress: 0, url: book?.book_cover || "", loading: false },
    back: { progress: 0, url: book?.book_cover2 || "", loading: false },
    spine: { progress: 0, url: book?.book_cover3 || "", loading: false },
    spread: { progress: 0, url: book?.book_cover4 || "", loading: false },
    pdf: { progress: 0, url: book?.pdf_url || "", loading: false },
    docx: { progress: 0, url: book?.text_url || "", loading: false },
  });

  const form = useForm<TCreateBookSchema>({
    resolver: zodResolver(createBookSchema),
    defaultValues: {
      title: book?.title ?? "",
      short_description: book?.short_description ?? "",
      long_description: book?.long_description ?? "",
      page_count: book?.page_count ?? 0,
      // author_id: book?.author_id ?? "",
      author_id: book?.author_id ?? sessionAuthorId ?? "",
      publisher_id: book?.publisher_id ?? (session.data?.user as any)?.publisher_id ?? "",
      category_ids: (book as any)?.categories?.map((c: any) => c.id) ?? [],
      paper_back: book?.paper_back ?? false,
      e_copy: book?.e_copy ?? true,
      hard_cover: book?.hard_cover ?? false,
      paperback_price: initialPrices.paperback,
      ebook_price: initialPrices.ebook,
      hardcover_price: initialPrices.hardcover,
    },
  });

  const watched = useWatch({ control: form.control });

  // Instant Upload Logic via Vercel Blob with progress tracking
  const handleInstantUpload = async (file: File, type: keyof typeof uploads) => {
    setUploads(prev => ({ ...prev, [type]: { ...prev[type], loading: true, progress: 0 } }));
    const formData = new FormData();
    formData.append("file", file);

    try {
      const { data } = await axios.post(`/api/avatar/upload?filename=${encodeURIComponent(file.name)}`, formData, {
        onUploadProgress: (p) => {
          setUploads(prev => ({ ...prev, [type]: { ...prev[type], progress: Math.round((p.loaded * 100) / (p.total || 1)) } }));
        }
      });
      setUploads(prev => ({ ...prev, [type]: { ...prev[type], url: data.url, loading: false } }));
    } catch (error) {
      setUploads(prev => ({ ...prev, [type]: { ...prev[type], loading: false, progress: 0 } }));
      toast({ variant: "destructive", title: "Upload Failed", description: "Could not upload asset." });
    }
  };

  // Automated Pricing Calculation based on Nigerian printing standards
  useEffect(() => {
    const base = 2000;
    const pageCost = (watched.page_count || 0) * 10;
    const markup = 1.3;

    if (watched.paper_back) form.setValue("paperback_price", Math.ceil((base + pageCost) * markup));
    if (watched.hard_cover) form.setValue("hardcover_price", Math.ceil((base + pageCost + 1500) * markup));
  }, [watched.page_count, watched.paper_back, watched.hard_cover, form]);

  // Logic to determine if the form is valid for specific toasts
  const isFormValid = useMemo(() => {
    const hasBaseInfo = !!(watched.title && watched.author_id && watched.long_description);
    const hasFormat = !!(watched.e_copy || watched.paper_back || watched.hard_cover);
    const frontUploaded = !!uploads.front.url;
    const isAnyLoading = Object.values(uploads).some(u => u.loading);

    if (!hasBaseInfo || !hasFormat || isAnyLoading || !frontUploaded) return false;

    if (watched.e_copy) {
      const docUploaded = !!(uploads.pdf.url || uploads.docx.url);
      if (!docUploaded || !watched.ebook_price || watched.ebook_price <= 0) return false;
    }

    if (watched.paper_back || watched.hard_cover) {
      if (!watched.page_count || watched.page_count <= 0) return false;
    }

    return true;
  }, [watched, uploads]);

  const { mutate: submitBook, isPending } = trpc[action === "Add" ? "createBook" : "updateBook"].useMutation({
    onSuccess: () => {
      toast({ title: "Success", description: `Product ${action === "Add" ? "published" : "updated"} successfully.` });
      Promise.all([
        utils.getAllBooks.invalidate(),           // Global list
        // utils.getBooksByAuthor.invalidate(),  
        utils.getBookByAuthor.invalidate(),    // The Author's private roster
        // utils.getBooksByPublisher.invalidate(),   // The Publisher's catalog
        // utils.getBooks.invalidate()               // Generic public list
      ]).then(() => {
        setOpen(false); // Close modal only after cache is cleared
      });
    },
    onError: (err) => toast({ variant: "destructive", title: "Submission Failed", description: err.message })
  });

  const onFinalSubmit = (values: TCreateBookSchema) => {
    // 1. Mandatory Front Cover check
    if (!uploads.front.url) {
      toast({ variant: "destructive", title: "Missing Cover", description: "The front cover image is required for all formats." });
      return;
    }

    // 2. Format-specific asset validation
    if (values.e_copy && !uploads.pdf.url && !uploads.docx.url) {
      toast({ variant: "destructive", title: "Missing Document", description: "Please upload a PDF or DOCX for the E-Book." });
      return;
    }

    const finalAuthorId = values.author_id || sessionAuthorId;

    if (!finalAuthorId) {
      toast({ variant: "destructive", title: "Validation Error", description: "Author context is missing." });
      return;
    }

    // 3. Prepare Payload: strip values for unselected formats to avoid Zod schema conflicts
    const payload = {
      ...values,
      id: book?.id,
      author_id: finalAuthorId,
      book_cover: uploads.front.url || null,
      
      // Cleanup associated physical fields if not selected
      book_cover2: (values.paper_back || values.hard_cover) ? (uploads.back.url || null) : null,
      book_cover3: (values.paper_back || values.hard_cover) ? (uploads.spine.url || null) : null,
      book_cover4: (values.paper_back || values.hard_cover) ? (uploads.spread.url || null) : null,
      page_count: (values.paper_back || values.hard_cover) ? (values.page_count || 0) : undefined,
      paperback_price: values.paper_back ? values.paperback_price : undefined,
      hardcover_price: values.hard_cover ? values.hardcover_price : undefined,
      
      // Cleanup digital fields if not selected
      pdf_url: values.e_copy ? (uploads.pdf.url || null) : null,
      text_url: values.e_copy ? (uploads.docx.url || null) : null,
      ebook_price: values.e_copy ? values.ebook_price : undefined,
      
      // Explicitly pass boolean status for backend removal logic
      paper_back: !!values.paper_back,
      hard_cover: !!values.hard_cover,
      e_copy: !!values.e_copy,
      
      // Resolve the primary price scalar for backwards compatibility
      price: values.e_copy 
        ? (values.ebook_price || 0) 
        : (values.paperback_price || values.hardcover_price || 0),
    };

    submitBook(payload as any);
  };

  const handleFormError = (errors: any) => {
    // Provide specific feedback for the first validation error found
    const errorEntries = Object.entries(errors);
    if (errorEntries.length > 0) {
      const [field, error] = errorEntries[0] as [string, any];
      
      // Skip irrelevant errors based on format selection
      if (field === 'page_count' && !watched.paper_back && !watched.hard_cover) return;
      if (field === 'ebook_price' && !watched.e_copy) return;
      if (field === 'paperback_price' && !watched.paper_back) return;
      if (field === 'hardcover_price' && !watched.hard_cover) return;

      toast({
        variant: "destructive",
        title: "Validation Error",
        description: error?.message || `Please check the ${field.replace('_', ' ')} field.`,
      });
    }
  };

  const menuButtonStyle = "w-full text-left px-3 py-2.5 text-xs font-black uppercase italic hover:bg-accent cursor-pointer flex items-center gap-2 transition-colors rounded-none outline-none border-none bg-transparent text-black shadow-none";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {/* Logic: Use external trigger if provided; otherwise, use the internal styled button */}
        {trigger ? (
          trigger
        ) : (
          <Button 
            className={cn(
              "rounded-none border-2 border-black transition-all font-black uppercase italic text-xs tracking-widest",
              action === "Edit" 
                ? menuButtonStyle // Blends into the management dropdown
                : "bg-black text-white gumroad-shadow h-14 px-8 hover:translate-x-[2px] block" // Standalone 'Add' button style
            )}
          >
            {action === "Edit" && <Edit3 size={14} />}
            {action} Book
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-none border-2 border-black p-0 bg-[#F4F4F4]">
        <div className="p-6 border-b-2 border-black bg-white sticky top-0 z-20">
          <DialogTitle className="text-2xl font-black uppercase italic">{action} Book</DialogTitle>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onFinalSubmit, handleFormError)} className="p-6 space-y-8">
            
            {/* 1. PRODUCT INFORMATION */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="h-8 w-8 bg-black text-white flex items-center justify-center font-bold">1</span>
                <h3 className="font-bold uppercase tracking-tight">Product Information</h3>
              </div>
              <div className="bg-white border-2 border-black p-6 space-y-4">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem><FormLabel className="font-bold text-xs">TITLE *</FormLabel><FormControl><Input className="input-gumroad" {...field} /></FormControl></FormItem>
                )} />
                {!sessionAuthorId && (
                  <FormField control={form.control} name="author_id" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-xs">AUTHOR *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="input-gumroad">
                            <SelectValue placeholder="Select Author" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-none border-2 border-black">
                          {authors?.map(a => (
                            <SelectItem key={a.id} value={a.id}>{a.user.first_name} {a.user.last_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                )}
                <FormField
                  control={form.control}
                  name="category_ids"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-xs uppercase">Categories *</FormLabel>
                      <div className="grid grid-cols-2 gap-2 bg-white border-2 border-black p-4 max-h-40 overflow-y-auto">
                        {categories?.map((cat) => (
                          <div key={cat.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={cat.id}
                              checked={field.value?.includes(cat.id)}
                              onCheckedChange={(checked) => {
                                const current = field.value || [];
                                return checked
                                  ? field.onChange([...current, cat.id])
                                  : field.onChange(current.filter((value) => value !== cat.id));
                              }}
                            />
                            <label htmlFor={cat.id} className="text-sm font-medium leading-none cursor-pointer">
                              {cat.name}
                            </label>
                          </div>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField control={form.control} name="long_description" render={({ field }) => (
                  <FormItem><FormLabel className="font-bold text-xs">DESCRIPTION *</FormLabel><FormControl><Textarea className="input-gumroad min-h-[100px]" {...field} /></FormControl></FormItem>
                )} />
              </div>
            </section>

            {/* 2. FORMAT SELECTION & PRICING */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="h-8 w-8 bg-black text-white flex items-center justify-center font-bold">2</span>
                <h3 className="font-bold uppercase tracking-tight">Format & Pricing</h3>
              </div>
              <div className="bg-white border-2 border-black divide-y-2 divide-black">
                
                {/* Physical Book Settings */}
                <div className="p-6 space-y-6">
                  <div className="flex gap-6">
                    <div className="flex items-center gap-2"><Checkbox checked={watched.paper_back} onCheckedChange={v => form.setValue("paper_back", !!v)} /><label className="font-bold text-sm">Paperback</label></div>
                    <div className="flex items-center gap-2"><Checkbox checked={watched.hard_cover} onCheckedChange={v => form.setValue("hard_cover", !!v)} /><label className="font-bold text-sm">Hardcover</label></div>
                  </div>
                  
                  {(watched.paper_back || watched.hard_cover) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-6 border-l-2 border-black animate-in fade-in slide-in-from-top-2">
                      <FormField control={form.control} name="page_count" render={({ field }) => (
                        <FormItem><FormLabel className="text-[10px] font-black uppercase">Page Count *</FormLabel><Input type="number" className="input-gumroad" {...field} value={field.value ?? ""} onChange={e => field.onChange(Number(e.target.value))} /></FormItem>
                      )} />
                      <div className="p-4 bg-[#82d236]/10 border border-black/10">
                        <p className="text-[10px] font-black uppercase mb-2">Automated Pricing (NGN)</p>
                        {watched.paper_back && <div className="flex justify-between font-bold text-sm italic"><span>Paperback:</span><span>₦{watched.paperback_price?.toLocaleString()}</span></div>}
                        {watched.hard_cover && <div className="flex justify-between font-bold text-sm italic"><span>Hardcover:</span><span>₦{watched.hardcover_price?.toLocaleString()}</span></div>}
                      </div>
                    </div>
                  )}
                </div>

                {/* Ebook Settings */}
                <div className="p-6 space-y-6">
                  <div className="flex items-center gap-2"><Checkbox checked={watched.e_copy} onCheckedChange={v => form.setValue("e_copy", !!v)} /><label className="font-bold text-sm">E-Copy (Digital)</label></div>
                  {watched.e_copy && (
                    <div className="pl-6 border-l-2 border-black animate-in fade-in slide-in-from-top-2">
                      <FormField control={form.control} name="ebook_price" render={({ field }) => (
                        <FormItem className="max-w-[200px]"><FormLabel className="text-[10px] font-black uppercase">E-Copy Price (NGN) *</FormLabel><Input type="number" className="input-gumroad" {...field} value={field.value ?? ""} onChange={e => field.onChange(Number(e.target.value))} /></FormItem>
                      )} />
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* 3. MEDIA & CONTENT UPLOADS */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="h-8 w-8 bg-black text-white flex items-center justify-center font-bold">3</span>
                <h3 className="font-bold uppercase tracking-tight">Content & Media</h3>
              </div>
              <div className="bg-white border-2 border-black p-6 space-y-8">
                
                {/* Global assets */}
                <UploadField label="Main Front Cover (Mandatory) *" type="front" uploads={uploads} onUpload={handleInstantUpload} accept="image/*" />

                {/* Format-specific physical assets */}
                {(watched.paper_back || watched.hard_cover) && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 border-t-2 border-black pt-8 animate-in fade-in">
                    <UploadField label="Back Cover" type="back" uploads={uploads} onUpload={handleInstantUpload} accept="image/*" />
                    <UploadField label="Spine" type="spine" uploads={uploads} onUpload={handleInstantUpload} accept="image/*" />
                    <UploadField label="Full Cover Spread" type="spread" uploads={uploads} onUpload={handleInstantUpload} accept="image/*" />
                  </div>
                )}

                {/* Format-specific digital assets */}
                {watched.e_copy && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t-2 border-black pt-8 animate-in fade-in">
                    <UploadField label="PDF Document *" type="pdf" uploads={uploads} onUpload={handleInstantUpload} accept=".pdf" />
                    <UploadField label="Web Reader (DOCX) *" type="docx" uploads={uploads} onUpload={handleInstantUpload} accept=".docx" />
                  </div>
                )}
              </div>
            </section>

            <Button 
              type="submit" 
              disabled={isPending || Object.values(uploads).some(u => u.loading)} 
              className="w-full h-16 bg-[#82d236] text-black font-black uppercase text-xl rounded-none border-2 border-black gumroad-shadow hover:translate-x-[3px] transition-all disabled:opacity-50 disabled:bg-gray-200 disabled:cursor-not-allowed"
            >
              {isPending ? <Loader2 className="animate-spin" /> : `${action} Product`}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

const UploadField = ({ label, type, uploads, onUpload, accept }: any) => {
  const data = uploads[type];
  return (
    <div className="space-y-1">
      <label className="text-[9px] font-black uppercase text-gray-500">{label}</label>
      <div className={cn("border-2 border-dashed border-black h-16 flex flex-col items-center justify-center cursor-pointer bg-secondary/10 transition-colors hover:bg-white", data.url && "border-green-600 bg-green-50")} onClick={() => document.getElementById(type)?.click()}>
        {data.loading ? (
          <div className="w-full px-4">
            <div className="h-1 bg-gray-200 w-full rounded-full overflow-hidden">
              <div className="h-full bg-black transition-all duration-300" style={{ width: `${data.progress}%` }} />
            </div>
          </div>
        ) : data.url ? (
          <div className="flex items-center gap-1 text-green-600 font-bold text-[10px]"><CheckCircle2 size={16} /> COMPLETED</div>
        ) : (
          <UploadCloud size={20} />
        )}
      </div>
      <input id={type} type="file" className="hidden" accept={accept} onChange={e => e.target.files?.[0] && onUpload(e.target.files[0], type)} />
    </div>
  );
};

export default BookForm;