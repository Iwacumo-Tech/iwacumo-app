import { handleCallback } from "@vercel/queue";
import { processBookDocument } from "@/server/module/book";

export const maxDuration = 300;

const queueHandler = handleCallback<{ bookId: string; jobId: string }>(
  async (message) => {
    await processBookDocument(message.jobId, message.bookId);
  },
);

export async function POST(request: Request): Promise<Response> {
  return queueHandler(request);
}
