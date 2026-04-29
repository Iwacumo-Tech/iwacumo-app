export type UploadCategory = "image" | "document";

const MB = 1024 * 1024;

export const UPLOAD_LIMITS = {
  image: 10 * MB,
  document: 50 * MB,
} as const;

export const IMAGE_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/avif",
] as const;

export const DOCUMENT_CONTENT_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export const UPLOAD_ALLOWED_CONTENT_TYPES: Record<UploadCategory, readonly string[]> = {
  image: IMAGE_CONTENT_TYPES,
  document: DOCUMENT_CONTENT_TYPES,
};

type FileLike = {
  name?: string | null;
  type?: string | null;
  size?: number | null;
};

function getLowercaseName(name?: string | null) {
  return (name ?? "").trim().toLowerCase();
}

export function isPdfFile(file: Pick<FileLike, "name" | "type">) {
  const name = getLowercaseName(file.name);
  return file.type === "application/pdf" || name.endsWith(".pdf");
}

export function isDocxFile(file: Pick<FileLike, "name" | "type">) {
  const name = getLowercaseName(file.name);
  return (
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    || name.endsWith(".docx")
  );
}

export function isImageFile(file: Pick<FileLike, "type">) {
  return typeof file.type === "string" && file.type.startsWith("image/");
}

export function inferUploadCategory(file: Pick<FileLike, "name" | "type">): UploadCategory | null {
  if (isImageFile(file)) return "image";
  if (isPdfFile(file) || isDocxFile(file)) return "document";
  return null;
}

export function normalizeUploadContentType(file: Pick<FileLike, "name" | "type">): string | null {
  if (isPdfFile(file)) return "application/pdf";
  if (isDocxFile(file)) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (isImageFile(file)) return file.type ?? null;
  return null;
}

export function formatUploadLimit(category: UploadCategory) {
  return `${Math.round(UPLOAD_LIMITS[category] / MB)}MB`;
}

export function getUploadValidationError(file: FileLike, requestedCategory?: UploadCategory | null) {
  const inferredCategory = inferUploadCategory(file);
  const category = requestedCategory ?? inferredCategory;

  if (!category) {
    return "Unsupported file type.";
  }

  if (requestedCategory && inferredCategory && requestedCategory !== inferredCategory) {
    return requestedCategory === "image"
      ? "Only JPG, PNG, WEBP, GIF, SVG, or AVIF images are allowed."
      : "Only PDF and DOCX files are allowed.";
  }

  const contentType = normalizeUploadContentType(file);
  if (!contentType || !UPLOAD_ALLOWED_CONTENT_TYPES[category].includes(contentType)) {
    return category === "image"
      ? "Only JPG, PNG, WEBP, GIF, SVG, or AVIF images are allowed."
      : "Only PDF and DOCX files are allowed.";
  }

  const size = file.size ?? 0;
  if (size > UPLOAD_LIMITS[category]) {
    return category === "image"
      ? `Images can be up to ${formatUploadLimit("image")}.`
      : `PDF and DOCX files can be up to ${formatUploadLimit("document")}.`;
  }

  return null;
}

export function sanitizeUploadFilename(filename: string) {
  return filename.replace(/[^\w.-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "upload";
}
