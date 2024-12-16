// pages/imageUpload.tsx
import { useState } from "react";
import uploadcare from "uploadcare-widget";
import "@uploadcare/widget/uploadcare-widget.css";
import Image from "next/image";

export default function ImageUpload () {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const handleUpload = () => {
    uploadcare
      .openDialog(null, { publicKey: process.env.UPLOADCARE_PUBLIC_KEY as string })
      .done((file) => {
        file.promise().then((info) => {
          setImageUrl(info.cdnUrl); // Store image URL in your state or database
        });
      });
  };

  return (
    <div>
      <button onClick={handleUpload}>Upload Image</button>
      {imageUrl && <Image src={imageUrl} alt="Uploaded" width={500} height={300} />}
    </div>
  );
}
