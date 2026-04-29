// revelation/src/lib/server.ts
import type { Permission } from "@prisma/client";
import { uploadFileToBlob, type UploadProgress } from "@/lib/upload-client";
import { type UploadCategory } from "@/lib/upload-policy";

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

/**
 * Upload helper for client-side surfaces that need a blob URL.
 * Direct browser uploads are used so large files never pass through a Vercel Function body.
 */
export async function uploadImage (
  file: File,
  options?: {
    category?: UploadCategory;
    purpose?: string;
    onUploadProgress?: (progress: UploadProgress) => void;
  }
): Promise<string> {
  const result = await uploadFileToBlob(file, {
    category: options?.category,
    purpose: options?.purpose ?? "uploads",
    onUploadProgress: options?.onUploadProgress,
  });

  return result.url;
}
