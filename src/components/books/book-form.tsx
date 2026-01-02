"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { createBookSchema, TCreateBookSchema } from "@/server/dtos";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Book } from "@prisma/client";
import { useSession } from "next-auth/react";
import { uploadImage } from "@/lib/server";

interface BookFormProps {
  book?: Book;
  action: "Add" | "Edit";
}

const BookForm = ({ book, action }: BookFormProps) => {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const session = useSession();
  const { data: authors } = trpc.getAuthorsByUser.useQuery({
    id: session.data?.user.id as string,
  });
  const [file, setFile] = useState<File | null>(null);
  const [file2, setFile2] = useState<File | null>(null);
  const [file3, setFile3] = useState<File | null>(null);
  const [file4, setFile4] = useState<File | null>(null);
  const [paperbackPrice, setPaperbackPrice] = useState<number>(0);
  const [hardcoverPrice, setHardcoverPrice] = useState<number>(0);
  const [ebookPrice, setEbookPrice] = useState<number>(0);

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [docxFile, setDocxFile] = useState<File | null>(null);

  // Helper function to get initial prices from book
  const getInitialPrices = () => {
    if (book && (book as any).variants) {
      const variants = (book as any).variants || [];
      const prices: { paperback?: number; hardcover?: number; ebook?: number } = {};
      variants.forEach((variant: any) => {
        if (variant.format === "paperback" && variant.list_price > 0) {
          prices.paperback = variant.list_price;
        } else if (variant.format === "hardcover" && variant.list_price > 0) {
          prices.hardcover = variant.list_price;
        } else if (variant.format === "ebook" && variant.list_price > 0) {
          prices.ebook = variant.list_price;
        }
      });
      return prices;
    } else if (book?.price && book.price > 0) {
      return {
        paperback: book.price,
        hardcover: book.price,
        ebook: book.price,
      };
    }
    return {};
  };

  const initialPrices = getInitialPrices();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] || null;

    setFile(selectedFile);
  };

  const handleFile2Change = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile2 = event.target.files?.[0] || null;

    setFile2(selectedFile2);
  };

  const handleFile3Change = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile3 = event.target.files?.[0] || null;

    setFile3(selectedFile3);
  };

  const handleFile4Change = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile4 = event.target.files?.[0] || null;

    setFile4(selectedFile4);
  };

  const form = useForm<TCreateBookSchema>({
    resolver: zodResolver(createBookSchema),
    defaultValues: {
      title: book?.title ?? "",
      short_description: book?.short_description ?? "",
      long_description: book?.long_description ?? "",
      price: book?.price ?? 0,
      tags: book?.tags?.join("*"),
      author_id: book?.author_id ?? "",
      publisher_id: book?.publisher_id ?? "",
      published: book?.published ?? false,
      featured: book?.featured ?? false,
      paper_back: book?.paper_back ?? false,
      e_copy: book?.e_copy ?? false,
      hard_cover: book?.hard_cover ?? false,
      paperback_price: initialPrices.paperback,
      hardcover_price: initialPrices.hardcover,
      ebook_price: initialPrices.ebook,
    },
  });

  // Initialize state from form values when editing
  useEffect(() => {
    if (book) {
      if (initialPrices.paperback) {
        setPaperbackPrice(initialPrices.paperback);
      }
      if (initialPrices.hardcover) {
        setHardcoverPrice(initialPrices.hardcover);
      }
      if (initialPrices.ebook) {
        setEbookPrice(initialPrices.ebook);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book]);

  const addBook = trpc.createBook.useMutation({
    onSuccess: async () => {
      toast({
        title: "Success",
        variant: "default",
        description: "Successfully added a new book",
      });

      utils.getAllBooks.invalidate().then(() => {
        setOpen(false); // Closes the Dialog 
      });
    },
    onError: (error) => {
      console.error(error);

      toast({
        title: "Error",
        variant: "destructive",
        description: "Error adding the book",
      });
    },
  });

  const updateBook = trpc.updateBook.useMutation({
    onSuccess: async () => {
      toast({
        title: "Success",
        variant: "default",
        description: "Successfully updated the book",
      });

      utils.getAllBooks.invalidate().then(() => {
        setOpen(false);
      });
    },
    onError: (error) => {
      console.error(error);

      toast({
        title: "Error",
        variant: "destructive",
        description: "Error updating the book",
      });
    },
  });

  const uploadMutation = trpc.imageUpload.useMutation();  

  const onSubmit = async (values: any) => {
  try {
    // 1. Upload Images (Restoring your working logic)
    const imageUrl = file ? await uploadImage(file) : (book?.book_cover || null);
    const imageUrl2 = file2 ? await uploadImage(file2) : (book?.book_cover2 || null);
    const imageUrl3 = file3 ? await uploadImage(file3) : (book?.book_cover3 || null);
    const imageUrl4 = file4 ? await uploadImage(file4) : (book?.book_cover4 || null);

    // 2. NEW: Upload Ebook Documents (PDF and DOCX)
    const pdfUrl = pdfFile ? await uploadImage(pdfFile) : (book?.pdf_url || null);
    const docxUrl = docxFile ? await uploadImage(docxFile) : (book?.text_url || null);

    // 3. Validation: Images
    const hasAtLeastOneImage = imageUrl || imageUrl2 || imageUrl3 || imageUrl4;
    if (!hasAtLeastOneImage) {
      toast({
        title: "Validation Error",
        variant: "destructive",
        description: "Please upload at least one book cover image",
      });
      return;
    }

    // 4. Validation: Formats
    const hasFormat = values.paper_back || values.e_copy || values.hard_cover;
    if (!hasFormat) {
      toast({
        title: "Validation Error",
        variant: "destructive",
        description: "Please select at least one format (Paperback, Hard Cover, or E-Copy)",
      });
      return;
    }

    // 5. Validation: Pricing
    const finalPaperbackPrice = values.paperback_price || paperbackPrice;
    const finalHardcoverPrice = values.hardcover_price || hardcoverPrice;
    const finalEbookPrice = values.ebook_price || ebookPrice;

    if (values.paper_back && (!finalPaperbackPrice || finalPaperbackPrice <= 0)) {
      toast({ title: "Validation Error", variant: "destructive", description: "Please enter a price for Paperback" });
      return;
    }
    if (values.hard_cover && (!finalHardcoverPrice || finalHardcoverPrice <= 0)) {
      toast({ title: "Validation Error", variant: "destructive", description: "Please enter a price for Hard Cover" });
      return;
    }
    if (values.e_copy && (!finalEbookPrice || finalEbookPrice <= 0)) {
      toast({ title: "Validation Error", variant: "destructive", description: "Please enter a price for E-Copy" });
      return;
    }

    // 6. Prepare Final Payload
    const payload = {
      ...values,
      book_cover: imageUrl,
      book_cover2: imageUrl2,
      book_cover3: imageUrl3,
      book_cover4: imageUrl4,
      cover_image_url: imageUrl, // Compatibility with new schema
      pdf_url: pdfUrl,
      docx_url: docxUrl, // This will trigger chapter creation in the backend
      paperback_price: values.paper_back ? finalPaperbackPrice : undefined,
      hardcover_price: values.hard_cover ? finalHardcoverPrice : undefined,
      ebook_price: values.e_copy ? finalEbookPrice : undefined,
    };

    if (book?.id) {
      updateBook.mutate({ ...payload, id: book.id });
    } else {
      addBook.mutate(payload);
    }
  } catch (error) {
    console.error("Submission Error:", error);
    toast({
      title: "Upload Error",
      variant: "destructive",
      description: "There was a problem uploading your files. Please try again.",
    });
  }
};

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className={`${action === "Edit" ? "w-full" : ""}`}>
          {action} Book
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto space-y-3">
        <DialogHeader>
          <DialogTitle>{action} Book</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="book-details" className="w-[400px]">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="book-details">Book Details</TabsTrigger>
            <TabsTrigger value="other-details">Other Details</TabsTrigger>
          </TabsList>
          <TabsContent value="book-details">
            <Card>
              <CardHeader>
                <CardTitle>Book Details</CardTitle>
                <CardDescription>
                  Make changes to the book information here.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit, (errors) => {
                    console.log("Errors: ", errors);
                  })}>
                    <fieldset disabled={form.formState.isSubmitting}>
                      <div className="grid gap-6">
                        <FormField
                          control={form.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Title</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter book title"
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
                          name="tags"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tags</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter tags separated by *"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="short_description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Short Description</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter a short description"
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
                          name="long_description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Long Description</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Enter a long description"
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
                          name="price"
                          render={({ field }) => {
                            const { onChange, value, ...restField } = field;

                            return (
                              <FormItem>
                                <FormLabel>Price</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    placeholder="Enter book price"
                                    onChange={(e) =>
                                      onChange(Number(e.target.value) || 0)
                                    }
                                    value={value}
                                    {...restField}
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
                          name="author_id"
                          render={({ field }) => (
                            <FormItem className="mt-2">
                              <FormLabel>Select Author</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl className="mt-1">
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select Author" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {authors?.map((author) => (
                                    <SelectItem
                                      role="option"
                                      key={author.user.first_name}
                                      value={author.id}
                                    >
                                      {author.user.first_name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        {/* Paper Back Checkbox */}
                        <FormField
                          control={form.control}
                          name="paper_back"
                          render={({ field }) => (
                            <FormItem>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <FormLabel>Paper Back</FormLabel>
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value}
                                      onCheckedChange={(value) =>
                                        field.onChange(value as boolean)
                                      }
                                      className="ml-2"
                                    />
                                  </FormControl>
                                </div>
                                {field.value && (
                                  <div className="flex-1 max-w-[200px] ml-4">
                                    <FormField
                                      control={form.control}
                                      name="paperback_price"
                                      render={({ field: priceField }) => (
                                        <Input
                                          type="number"
                                          placeholder="Price"
                                          value={priceField.value || ""}
                                          onChange={(e) => {
                                            const value = Number(e.target.value) || 0;
                                            priceField.onChange(value);
                                            setPaperbackPrice(value);
                                          }}
                                          className="border-gray-300 rounded-md"
                                        />
                                      )}
                                    />
                                  </div>
                                )}
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* E-Copy Checkbox */}
                        <FormField
                          control={form.control}
                          name="e_copy"
                          render={({ field }) => (
                            <FormItem>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <FormLabel>E-Copy</FormLabel>
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value}
                                      onCheckedChange={(value) =>
                                        field.onChange(value as boolean)
                                      }
                                      className="ml-2"
                                    />
                                  </FormControl>
                                </div>
                                {field.value && (
                                  <div className="flex-1 max-w-[200px] ml-4">
                                    <FormField
                                      control={form.control}
                                      name="ebook_price"
                                      render={({ field: priceField }) => (
                                        <Input
                                          type="number"
                                          placeholder="Price"
                                          value={priceField.value || ""}
                                          onChange={(e) => {
                                            const value = Number(e.target.value) || 0;
                                            priceField.onChange(value);
                                            setEbookPrice(value);
                                          }}
                                          className="border-gray-300 rounded-md"
                                        />
                                      )}
                                    />
                                  </div>
                                )}
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Hard Cover Checkbox */}
                        <FormField
                          control={form.control}
                          name="hard_cover"
                          render={({ field }) => (
                            <FormItem>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <FormLabel>Hard Cover</FormLabel>
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value}
                                      onCheckedChange={(value) =>
                                        field.onChange(value as boolean)
                                      }
                                      className="ml-2"
                                    />
                                  </FormControl>
                                </div>
                                {field.value && (
                                  <div className="flex-1 max-w-[200px] ml-4">
                                    <FormField
                                      control={form.control}
                                      name="hardcover_price"
                                      render={({ field: priceField }) => (
                                        <Input
                                          type="number"
                                          placeholder="Price"
                                          value={priceField.value || ""}
                                          onChange={(e) => {
                                            const value = Number(e.target.value) || 0;
                                            priceField.onChange(value);
                                            setHardcoverPrice(value);
                                          }}
                                          className="border-gray-300 rounded-md"
                                        />
                                      )}
                                    />
                                  </div>
                                )}
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <FormLabel>Downloadable PDF (for Watermarking)</FormLabel>
                            <Input type="file" accept=".pdf" onChange={(e) => setPdfFile(e.target.files?.[0] || null)} />
                          </div>
                          <div className="space-y-2">
                            <FormLabel>Reader Document (DOCX)</FormLabel>
                            <Input type="file" accept=".docx" onChange={(e) => setDocxFile(e.target.files?.[0] || null)} />
                          </div>
                        </div>

                        <div className="">
                          <p>Book Cover</p>
                          <label
                            htmlFor="fileUpload"
                            className="cursor-pointer w-full px-4 py-2 text-slate-100 border rounded-md flex items-center gap-3"
                          >
                            <span className="bg-blue-700 p-1 text-sm rounded">
                              Upload File
                            </span>
                            {file && (
                              <p className="mt-2 text-sm text-gray-700">
                                {file.name}
                              </p>
                            )}
                          </label>
                          <input
                            id="fileUpload"
                            type="file"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                        </div>
                        <div className="">
                          <p>Book Cover 2</p>
                          <label
                            htmlFor="fileUpload2"
                            className="cursor-pointer w-full px-4 py-2 text-slate-100 border rounded-md flex items-center gap-3"
                          >
                            <span className="bg-blue-700 p-1 text-sm rounded">
                              Upload File
                            </span>
                            {file2 && (
                              <p className="mt-2 text-sm text-gray-700">
                                {file2.name}
                              </p>
                            )}
                          </label>
                          <input
                            id="fileUpload2"
                            type="file"
                            onChange={handleFile2Change}
                            className="hidden"
                          />
                        </div>
                        <div className="">
                          <p>Book Cover 3</p>
                          <label
                            htmlFor="fileUpload3"
                            className="cursor-pointer w-full px-4 py-2 text-slate-100 border rounded-md flex items-center gap-3"
                          >
                            <span className="bg-blue-700 p-1 text-sm rounded">
                              Upload File
                            </span>
                            {file3 && (
                              <p className="mt-2 text-sm text-gray-700">
                                {file3.name}
                              </p>
                            )}
                          </label>
                          <input
                            id="fileUpload3"
                            type="file"
                            onChange={handleFile3Change}
                            className="hidden"
                          />
                        </div>
                        <div className="">
                          <p>Book Cover 4</p>
                          <label
                            htmlFor="fileUpload4"
                            className="cursor-pointer w-full px-4 py-2 text-slate-100 border rounded-md flex items-center gap-3"
                          >
                            <span className="bg-blue-700 p-1 text-sm rounded">
                              Upload File
                            </span>
                            {file4 && (
                              <p className="mt-2 text-sm text-gray-700">
                                {file4.name}
                              </p>
                            )}
                          </label>
                          <input
                            id="fileUpload4"
                            type="file"
                            onChange={handleFile4Change}
                            className="hidden"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end my-5">
                        <Button
                          disabled={form.formState.isSubmitting}
                          className="bg-blue-600 text-white py-2 px-7 rounded-md"
                          type="submit"
                          data-cy="book-submit"
                        >
                          {action === "Add" ? "Proceed" : "Save Changes"}
                        </Button>
                      </div>
                    </fieldset>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="other-details"></TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default BookForm;
