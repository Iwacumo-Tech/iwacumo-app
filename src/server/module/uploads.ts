import { imageUploadSchema } from "@/server/dtos";
import { publicProcedure } from "@/server/trpc";
import { auth } from "@/auth";
import axios from "axios";

interface CloudinaryResponse {
  url: string;
}

export const imageUpload = publicProcedure.input(imageUploadSchema).mutation(async (opts) => {
  const session = await auth();

  if(!session) {
    console.error("User session not found");

    return;
  }

  const formData = new FormData();

  formData.append("file", opts.input.file!);
  formData.append("upload_preset", "ewf7xmbi");

  const response = await axios.post<CloudinaryResponse>("https://api.cloudinary.com/v1_1/dws9ykgky/image/upload", formData);
  const imgUrl = response.data.url;

  return imgUrl;
});

export const createImageUpload = publicProcedure.input(imageUploadSchema).query(async (opts) => {
  const formData = new FormData();

  formData.append("file", opts.input.file!);
  formData.append("upload_preset", "ewf7xmbi");

  const response = await axios.post<CloudinaryResponse>("https://api.cloudinary.com/v1_1/dws9ykgky/image/upload", formData);
  const imgUrl = response.data.url;

  return imgUrl;
});
