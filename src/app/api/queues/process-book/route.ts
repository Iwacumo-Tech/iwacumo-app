import { handleCallback } from "@vercel/queue";
import { processBookDocument } from "@/server/module/book";

export const maxDuration = 300;

export const POST = handleCallback(async (message: { bookId: string; jobId: string }) => {
  await processBookDocument(message.jobId, message.bookId);
});
