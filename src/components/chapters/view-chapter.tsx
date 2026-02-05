"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

interface ViewChaptersProps {
  id: string;
  trigger?: React.ReactNode;
}

export const ViewChapters = ({ id, trigger }: ViewChaptersProps) => {
  return (
    <Link href={`/app/books/${id}`} className="w-full">
      {trigger ? (
        trigger
      ) : (
        <Button 
          size="lg" 
          data-cy="view-chapter"
          className="bg-black text-white rounded-none border-2 border-black gumroad-shadow h-12 w-full uppercase font-black italic text-xs tracking-widest"
        >
          View Chapters
        </Button>
      )}
    </Link>
  );
};