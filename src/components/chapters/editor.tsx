import { useEffect, useState } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

interface TextFileProps {
  value: string;
  onChange: (content: string) => void;
  setContentWordCount: React.Dispatch<React.SetStateAction<number>>;
}

function TextFile ({ value, onChange, setContentWordCount }: TextFileProps) {
  const [wordCount, setWordCount] = useState<number>(0);

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
