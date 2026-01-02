// revelation/src/lib/server.ts
import { Permission } from "@prisma/client";

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
 * Augmented uploadImage (now handles images, PDFs, and DOCX)
 * Uses the internal /api/avatar/upload route which leverages Vercel Blob
 */
export async function uploadImage (file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  // Call the existing Vercel Blob API route
  const response = await fetch(`/api/avatar/upload?filename=${encodeURIComponent(file.name)}`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to upload file");
  }

  const data = await response.json();
  // Vercel Blob returns the public URL in the 'url' property
  return data.url;
}