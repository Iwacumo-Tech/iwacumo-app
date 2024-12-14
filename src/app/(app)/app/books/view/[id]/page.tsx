"use client";

import { trpc } from "@/app/_providers/trpc-provider";
import { useParams } from "next/navigation";
import "react-quill/dist/quill.snow.css";
import ViewBookPage from "@/components/books/book-viewer";

const ChapterPage = () => {
  const params = useParams();
  const id = params?.id as string;
  const { data: singleBook, isLoading, isError } = trpc.getBookById.useQuery({ id: id });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (isError || !singleBook) {
    return <div>Error fetching chapters</div>;
  }

  if(!singleBook) {
    return <div>No book details</div>;
  }

  return (
    <div>
      <ViewBookPage book={singleBook} />
    </div>
  );
};

export default ChapterPage;
