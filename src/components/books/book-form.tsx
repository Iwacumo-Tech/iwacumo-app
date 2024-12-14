"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { createBookSchema, TCreateBookSchema } from "@/server/dtos";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
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
  const session = useSession();  const { data: authors } = trpc.getAuthorsByUser.useQuery({ id: session.data?.user.id as string });
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] || null;

    setFile(selectedFile);
  };

  const form = useForm<TCreateBookSchema>({
    resolver: zodResolver(createBookSchema),
    defaultValues: {
      title: book?.title ?? "",
      description: book?.description ?? "",
      price: book?.price ?? 0,
      author_id: book?.author_id ?? "",
      publisher_id: book?.publisher_id ?? "",
    },
  });

  const addBook = trpc.createBook.useMutation({
    onSuccess: async () => {
      toast({
        title: "Success",
        variant: "default",
        description: "Successfully added a new book",
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

  const onSubmit = async (values: TCreateBookSchema) => {
    const imageUrl = await uploadImage(file!);

    if (book?.id) {
      updateBook.mutate({
        ...values,
        id: book.id,
        book_cover: imageUrl
      });
    } else {
      addBook.mutate({ ...values, book_cover: imageUrl });
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
                              <FormLabel className="text-gray-700">Title</FormLabel>
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
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-700">Description</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter book description"
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
                                <FormLabel className="text-gray-700">Price</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    placeholder="Enter book price"
                                    onChange={(e) => onChange(Number(e.target.value) || 0)}
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
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl className="mt-1">
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select Author" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>

                                  {authors?.map((author) => (
                                    <SelectItem role="option" key={author.user.first_name} value={author.id}>
                                      {author.user.first_name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
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
                            <span className="bg-blue-700 p-1 text-sm rounded">Upload File</span>
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

          <TabsContent value="other-details">
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default BookForm;
