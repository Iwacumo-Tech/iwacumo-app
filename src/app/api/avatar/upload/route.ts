import { auth } from "@/auth";
import {
  handleUpload,
  type HandleUploadBody,
} from "@vercel/blob/client";
import { NextResponse } from "next/server";
import {
  type UploadCategory,
  UPLOAD_ALLOWED_CONTENT_TYPES,
  UPLOAD_LIMITS,
  getUploadValidationError,
} from "@/lib/upload-policy";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as HandleUploadBody;
    const isTokenRequest = body?.type === "blob.generate-client-token";

    if (isTokenRequest) {
      const session = await auth();
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        if (!clientPayload) {
          throw new Error("Missing upload metadata.");
        }

        const parsedPayload = JSON.parse(clientPayload) as {
          category?: UploadCategory;
          originalFilename?: string;
          contentType?: string;
          size?: number;
        };

        const category = parsedPayload.category;
        if (!category || !(category in UPLOAD_LIMITS)) {
          throw new Error("Invalid upload category.");
        }

        const validationError = getUploadValidationError(
          {
            name: parsedPayload.originalFilename,
            type: parsedPayload.contentType,
            size: parsedPayload.size,
          },
          category
        );

        if (validationError) {
          throw new Error(validationError);
        }

        return {
          allowedContentTypes: [...UPLOAD_ALLOWED_CONTENT_TYPES[category]],
          maximumSizeInBytes: UPLOAD_LIMITS[category],
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async () => {
        return;
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error("File upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to upload file" },
      { status: 400 }
    );
  }
}
