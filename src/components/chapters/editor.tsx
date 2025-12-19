"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const ReactQuill = dynamic(() => import("react-quill-new"), { 
  ssr: false,
  loading: () => <div className="h-96 border rounded-md p-4">Loading editor...</div>
});

interface TextFileProps {
  value: string;
  onChange: (content: string) => void;
  setContentWordCount: React.Dispatch<React.SetStateAction<number>>;
}

function TextFile ({ value, onChange, setContentWordCount }: TextFileProps) {
  const [wordCount, setWordCount] = useState<number>(0);
  const [cssLoaded, setCssLoaded] = useState(false);

  // Load CSS dynamically on client side only
  useEffect(() => {
    if (typeof window !== "undefined" && !cssLoaded) {
      // Check if CSS is already loaded
      const existingLink = document.querySelector('link[href*="quill.snow.css"]');
      if (!existingLink) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://cdn.quilljs.com/1.3.6/quill.snow.css";
        document.head.appendChild(link);
      }
      setCssLoaded(true);
    }
  }, [cssLoaded]);

  const toolbarOptions = [
    [{ "header": "1" }, { "header": "2" }, { "font": [] }],
    [{ size: [] }],
    ["bold", "italic", "underline", "strike", "blockquote"],
    [{ "list": "ordered" }, { "list": "bullet" }, { "indent": "-1" }, { "indent": "+1" }],
    ["link", "image", "video"],
    ["clean"]
  ];

  const modules = { toolbar: toolbarOptions };

  const countWords = (content: string): number => {
    const text = content.replace(/<\/?[^>]+(>|$)/g, "").trim();

    return text === "" ? 0 : text.split(/\s+/).length;
  };

  useEffect(() => {
    setWordCount(countWords(value));
    setContentWordCount(countWords(value));
  }, [value, setContentWordCount]);

  return (
    <div className="flex flex-col gap-2">
      <div>
        <ReactQuill
          modules={modules}
          theme="snow"
          value={value}
          onChange={onChange}
          className="h-96 block"
        />
      </div>
      <p className="text-sm mt-12 text-gray-500">Word Count: {wordCount}</p>
    </div>
  );
}

export default TextFile;
