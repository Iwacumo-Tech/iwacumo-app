
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export const  ViewChapters  = ({ id }: { id: string }) =>{
  return (
    <Link href={`books/${id}`}>
      <Button size="lg" data-cy="view-chapter">
        View Chapters
      </Button>
    </Link>
  );
};
