"use client";

import { useToast } from "@/components/ui/use-toast";
import { trpc } from "@/app/_providers/trpc-provider";
import { useState } from "react";
import { createChapterSchema, TCreateChapterSchema } from "@/server/dtos";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import TextFile from "./editor";
import { Chapter } from "@prisma/client";

interface ChapterFormProps {
  chapter?: Chapter;
  action: "Add" | "Edit";
  setShowForm: React.Dispatch<React.SetStateAction<boolean>>;
  bookId: string;

}

const ChapterForm = ({ chapter, action, setShowForm, bookId }: ChapterFormProps) => {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [wordCount, setWordCount] = useState(0);
  const [contentWordCount, setContentWordCount] = useState(0);

  const countWords = (text: string) => {
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  };

  const form = useForm<TCreateChapterSchema>({
    resolver: zodResolver(createChapterSchema),
    defaultValues: {
      title: chapter?.title ?? "",
      content: chapter?.content ?? "",
      summary: chapter?.summary as string ?? "",
      word_count: contentWordCount,
      chapter_number: chapter?.chapter_number ?? undefined,
      book_id: bookId,
    },
  });

  const addChapter = trpc.createChapter.useMutation({
    onSuccess: async () => {
      toast({
        title: "Success",
        variant: "default",
        description: "Successfully added a chapter",
      });

      utils.getAllChapters.invalidate().then(() => {
        setShowForm(false);
      });
    },
    onError: (error) => {
      console.error(error);

      toast({
        title: "Error",
        variant: "destructive",
        description: "Error adding chapter",
      });
    },
  });

  const updateChapter = trpc.updateChapter.useMutation({
    onSuccess: async () => {
      toast({
        title: "Success",
        variant: "default",
        description: "Successfully updated the chapter",
      });

      utils.getAllChapters.invalidate().then(() => {
        setShowForm(false);
      });
    },
    onError: (error) => {
      console.error(error);

      toast({
        title: "Error",
        variant: "destructive",
        description: "Error updating the chapter",
      });
    },
  });

  const onSubmit = (values: TCreateChapterSchema) => {
    console.log("send data: ", values);

    if (chapter?.id) {
      updateChapter.mutate({
        ...values,
        id: chapter.id,
      });
    } else {
      addChapter.mutate(values);
    }
  };

  return (
    <>
      <Tabs defaultValue="chapter-details" className="w-full mt-20">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="chapter-details">Chapter Details</TabsTrigger>
        </TabsList>
        <TabsContent value="chapter-details">
          <Card>
            <CardHeader>
              <CardTitle>Chapter Details</CardTitle>
              <CardDescription>
                  Make changes to the chapter information here.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                  <fieldset disabled={form.formState.isSubmitting}>
                    <div className="grid gap-6">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-700">Title</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter chapter title"
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
                          name="chapter_number"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-700">Chapter Number</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter chapter number"
                                  {...field}
                                  className="border-gray-300 rounded-md"
                                  onChange={(e) => field.onChange(Number(e.target.value))}

                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="content"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-700">Content</FormLabel>
                            <FormControl>
                              <TextFile
                                value={field.value}
                                onChange={field.onChange}
                                setContentWordCount={setContentWordCount}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="mt-10">
                        <FormField
                          control={form.control}
                          name="summary"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-700">Summary</FormLabel>
                              <FormControl>
                                <textarea
                                  placeholder="Enter chapter summary"
                                  {...field}
                                  className="border-gray-300 border rounded-md w-full h-32 p-2"
                                  onChange={(e) => {
                                    field.onChange(e);
                                    setWordCount(countWords(e.target.value));
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                              <span className="ml-2 text-gray-500">({wordCount} words)</span>
                            </FormItem>
                          )}
                        />
                      </div>

                    </div>
                    <div className="flex justify-end gap-2 my-5">
                      <Button
                        disabled={form.formState.isSubmitting}
                        className="bg-blue-600 text-white py-2 px-7 rounded-md"
                        type="submit"
                      >
                        {action === "Add" ? "Proceed" : "Save Changes"}
                      </Button>
                      <Button
                        disabled={form.formState.isSubmitting}
                        type="button"
                        className=" text-black border border-blue-600 bg-white py-2 px-7 rounded-md"
                        onClick={(e) => {e.preventDefault(); setShowForm(false);}}
                      >
                        Cancel
                      </Button>
                    </div>
                  </fieldset>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
};

export default ChapterForm;
