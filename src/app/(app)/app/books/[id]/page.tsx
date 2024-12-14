"use client";

import { trpc } from "@/app/_providers/trpc-provider";
import { useParams } from "next/navigation";
import "react-quill/dist/quill.snow.css";
import { chapterColumns } from "@/components/chapters/columns";
import ChapterForm from "@/components/chapters/chapter-form";
import { ChapterDataTable } from "./data-table";
import { useState } from "react";
import { Chapter } from "@prisma/client";
import Link from "next/link";

const ChapterPage = () => {
  const params = useParams();
  const id = params?.id as string;
  const { data: book } = trpc.getBookById.useQuery({ id: id });
  const { data: foundChapters, isLoading, isError } = trpc.getAllChapterByBookId.useQuery({ book_id: id });
  const [showForm, setShowForm] = useState(false);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (isError || !foundChapters) {
    return <div>Error fetching chapters</div>;
  }

  return (
    <div className="p-4">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg">Book Title: {book?.title}</h3>
            <p className="mb-2">Create, see and manage chapters</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowForm(true)} className="p-3 text-sm font-semibold border rounded-lg">New Chapter </button>
            <Link href={`/app/books/view/${id}`} className="p-3 text-sm font-semibold border rounded-lg">
            Read Book
            </Link>
          </div>
        </div>
        {!showForm ?
          <ChapterDataTable data={foundChapters} columns={chapterColumns} />
          :
          <ChapterForm chapter={{} as Chapter} action="Add" setShowForm={setShowForm} bookId={id}/>}

      </div>

    </div>
  );
};

export default ChapterPage;
