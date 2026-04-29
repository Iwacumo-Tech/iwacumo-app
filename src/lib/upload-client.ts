"use client";

import { upload } from "@vercel/blob/client";
import {
  type UploadCategory,
  getUploadValidationError,
  inferUploadCategory,
  normalizeUploadContentType,
  sanitizeUploadFilename,
} from "@/lib/upload-policy";

export type UploadProgress = {
  loaded: number;
  total: number;
  percentage: number;
};

type UploadClientOptions = {
  category?: UploadCategory;
  purpose?: string;
  onUploadProgress?: (progress: UploadProgress) => void;
};

function sanitizePurpose(purpose?: string) {
  return (purpose ?? "general").replace(/[^\w/-]+/g, "-").replace(/\/+/g, "/").replace(/^\/|\/$/g, "") || "general";
}

export async function uploadFileToBlob(file: File, options: UploadClientOptions = {}) {
  const category = options.category ?? inferUploadCategory(file);
  const validationError = getUploadValidationError(file, category);

  if (!category || validationError) {
    throw new Error(validationError ?? "Unsupported file type.");
  }

  const contentType = normalizeUploadContentType(file);
  if (!contentType) {
    throw new Error("Unsupported file type.");
  }

  const pathname = `${sanitizePurpose(options.purpose)}/${Date.now()}-${sanitizeUploadFilename(file.name)}`;

  return upload(pathname, file, {
    access: "public",
    contentType,
    handleUploadUrl: "/api/avatar/upload",
    multipart: category === "document" || file.size > 4 * 1024 * 1024,
    clientPayload: JSON.stringify({
      category,
      purpose: sanitizePurpose(options.purpose),
      originalFilename: file.name,
      contentType,
      size: file.size,
    }),
    onUploadProgress: options.onUploadProgress,
  });
}
