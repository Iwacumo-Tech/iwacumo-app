import { Permission } from "@prisma/client";
import axios from "axios";

interface CloudinaryResponse {
  url: string;
}

export function checkPermission (slug: string | null, permissions: Permission[]) {
  try {
    if (!slug || !permissions.some(({ resource_id, module }) => (module == "publisher" || module == "author") && resource_id == slug)) {
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error checking permission:", error);

    return false;
  }
}

export async function uploadImage (file: File) {
  const formData = new FormData();

  formData.append("file", file!);
  formData.append("upload_preset", "ewf7xmbi");

  const response = await axios.post<CloudinaryResponse>("https://api.cloudinary.com/v1_1/dws9ykgky/image/upload", formData);
  const imgUrl = response.data.url;

  return imgUrl;
}

