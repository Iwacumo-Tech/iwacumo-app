"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
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
    },
  });

  const addBook = trpc.createBook.useMutation({
    onSuccess: async () => {
      toast({
        title: "Success",
        variant: "default",
        description: "Successfully added a new book",
      });

      utils.getAllBooks.invalidate();
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

  const onSubmit = async (values: any) => {
    const imageUrl = file ? await uploadImage(file) : book?.book_cover ?? null;
    const imageUrl2 = file2
      ? await uploadImage(file2)
      : book?.book_cover2 ?? null;
    const imageUrl3 = file3
      ? await uploadImage(file3)
      : book?.book_cover3 ?? null;
    const imageUrl4 = file4
      ? await uploadImage(file4)
      : book?.book_cover4 ?? null;

    const payload = {
      ...values,
      book_cover: imageUrl as string,
      book_cover2: imageUrl2 as string,
      book_cover3: imageUrl3 as string,
      book_cover4: imageUrl4 as string,
    };

    if (book?.id) {
      updateBook.mutate({ ...payload, id: book.id });
    } else {
      addBook.mutate(payload);
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
                  <form onSubmit={form.handleSubmit(onSubmit)}>
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
                              <FormMessage />
                            </FormItem>
                          )}
                        />

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
