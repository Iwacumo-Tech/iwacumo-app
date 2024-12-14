"use client";

import { useParams } from "next/navigation";
import "react-quill/dist/quill.snow.css";
import SignUpForm from "@/app/(signup)/sign-up/signup-form";
import AuthorSignUpForm from "@/app/(signup)/sign-up/author-signup-form";

const ChapterPage = () => {
  const params = useParams();
  const id = params?.id as string;

  return (
    <div className="p-4">
      {id === "publisher" ? <SignUpForm /> : <AuthorSignUpForm />}

    </div>
  );
};

export default ChapterPage;
