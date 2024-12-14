// pages/imageUpload.tsx
import { useState } from "react";
import uploadcare from "uploadcare-widget";
import "@uploadcare/widget/uploadcare-widget.css";

export default function ImageUpload() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const handleUpload = () => {
    uploadcare
      .openDialog(null, {
        publicKey: process.env.UPLOADCARE_PUBLIC_KEY as string,
      })
      .done((file) => {
        file.promise().then((info) => {
          setImageUrl(info.cdnUrl); // Store image URL in your state or database
        });
      });
  };

  return (
    <div>
      <button onClick={handleUpload}>Upload Image</button>
      {imageUrl && <img src={imageUrl} alt="Uploaded" />}
    </div>
  );
}
