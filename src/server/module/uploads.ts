import { imageUploadSchema } from "@/server/dtos";
import { publicProcedure } from "@/server/trpc";
import { auth } from "@/auth";
import axios from "axios";
import { TRPCError } from "@trpc/server";

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

export const fileUpload = publicProcedure.input(imageUploadSchema).mutation(async (opts) => {
  const session = await auth();
  if(!session) throw new TRPCError({ code: "UNAUTHORIZED" });

  const formData = new FormData();
  formData.append("file", opts.input.file!);
  formData.append("upload_preset", "ewf7xmbi");
  
  // Use 'auto' resource_type to support PDFs and DOCX files in Cloudinary
  const response = await axios.post<CloudinaryResponse>(
    "https://api.cloudinary.com/v1_1/dws9ykgky/auto/upload", 
    formData
  );
  
  return response.data.url;
});