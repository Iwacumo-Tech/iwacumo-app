"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectContent,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { bookSlideSchema, TbookSlideSchema } from "@/server/dtos";
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

const AddFeaturedProduct = () => {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const { data: books = [] } = trpc.getAllBooks.useQuery(); // Fetch books from the database

  const form = useForm<TbookSlideSchema>({
    resolver: zodResolver(bookSlideSchema),
    defaultValues: {
      title: "",
      price: 0,
      description: "",
      image: "",
    },
  });

  const addHeroSlide = trpc.addFeaturedProducts.useMutation({
    onSuccess: async () => {
      toast({
        title: "Success",
        variant: "default",
        description: "Successfully Added Featured Product",
      });

      utils.getAllFeaturedProducts.invalidate().then(() => {
        setOpen(false);
        form.reset();
      });
    },
    onError: (error) => {
      console.error(error);

      toast({
        title: "Error",
        variant: "destructive",
        description: "Error adding featured product",
      });
    },
  });

  const onSubmit = (values: TbookSlideSchema) => {
    addHeroSlide.mutate(values);
  };

  const handleBookSelection = (bookId: string) => {
    const book = books.find((b) => b.id === bookId);

    if (book) {
      setSelectedBook(book);
      form.setValue("title", book.title);
      form.setValue("description", book.description);
      form.setValue("price", book.price);
      form.setValue("image", book.book_cover as string);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Add Featured Product</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto space-y-3">
        <DialogHeader>
          <DialogTitle>Add Featured Product</DialogTitle>
        </DialogHeader>
        <Card>
          <CardHeader>
            <CardTitle>Add Featured Product Details</CardTitle>
            <CardDescription>
              Select a book from the dropdown to populate the fields.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <fieldset disabled={form.formState.isSubmitting}>
                  <div className="space-y-4">
                    <FormItem>
                      <FormLabel className="text-gray-700">
                        Select Book
                      </FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={(value) => handleBookSelection(value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a book" />
                          </SelectTrigger>
                          <SelectContent>
                            {books.map((book) => (
                              <SelectItem key={book.id} value={book.id}>
                                {book.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  </div>
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
                              readOnly
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
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700">Price</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter slide price"
                              {...field}
                              className="border-gray-300 rounded-md"
                              readOnly
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
                              readOnly
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
                              readOnly
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
                      Add product
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

export default AddFeaturedProduct;
