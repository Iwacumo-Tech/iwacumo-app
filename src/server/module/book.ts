import { auth } from "@/auth";
import { z } from "zod";
import prisma from "@/lib/prisma";
import {
  createBookSchema,
  deleteBookSchema,
  findBookByIdSchema,
  reportBookIssueSchema,
  toggleFeaturedSchema,
  updateBookIssueReportStatusSchema,
} from "@/server/dtos";
import { publicProcedure } from "@/server/trpc";
import { TRPCError } from "@trpc/server";
import mammoth from "mammoth"; 
import axios from "axios"
import { watermarkPdf } from "@/lib/watermark";
import { put } from "@vercel/blob";
import { send } from "@vercel/queue";
import { generateObject } from "ai";
import { getAIChapterProvider, getAIModel } from "@/lib/ai";

import { sendBookApprovedEmail, sendBookDeniedEmail, sendBookIssueReportEmail } from "@/lib/email";
import { resolveBookCreationPayoutStatus } from "@/server/module/payment-accounts";

import { checkIsSuperAdmin, resolveUserContext } from "@/lib/is-super-admin";
import {
  formatDimensionsInches,
  getCustomFieldValueMap,
  getFlapCost,
  matchSizeBucket,
  normalizeBookFeatureToggles,
  normalizeBookFlapCosts,
  normalizeBookLivePricingEnabled,
  normalizeBookSizeRanges,
  slugifyBookAssetName,
  STANDARD_SIZE_DIMENSIONS_IN,
} from "@/lib/book-config";

/**
 * Refactored Book Module
 * * FIX: Uses 'publisher: { connect: { id } }' instead of 'publisher_id' scalar to resolve Prisma validation errors.
 * * MAINTAINS ALL EXISTING LOGIC including:
 * - Legacy format flags (paper_back, e_copy, hard_cover)
 * - Multi-cover validation (book_cover 1-4)
 * - Complex procedures (getPurchasedBooksByCustomer, getBookByAuthor, etc.)
 */

// Weight in grams, using admin-configured constants
function computeWeightGrams(
  format: string,
  size: string | undefined,
  pageCount: number,
  bookWeights: any
): number | null {
  if (format === "ebook" || format === "audiobook") return null;
  const fmtKey = format === "hardcover" ? "hardcover" : "paperback";
  const sizeKey = size || "A5";
  const cfg = bookWeights?.[fmtKey]?.[sizeKey];
  if (!cfg) return null;
  return Math.round(cfg.cover + pageCount * cfg.page);
}

function normalisePrimitive(raw: any, fallback: number): number {
  if (raw === null || raw === undefined) return fallback;
  if (typeof raw === "number") return raw;
  let val = raw;
  while (typeof val === "object" && val !== null && "value" in val) {
    val = val.value;
  }
  if (typeof val === "object" && val !== null && "v" in val) {
    val = (val as any).v;
  }
  return typeof val === "number" ? val : fallback;
}

function roundUp100(n: number): number {
  return Math.ceil(n / 100) * 100;
}

function isBookInactiveForPublic(book: { status?: string | null; deleted_at?: Date | null; published?: boolean | null }) {
  return !!book.deleted_at || !book.published || book.status === "archived";
}

function resolveBookStoreContext(book: {
  publisher?: {
    custom_domain?: string | null;
    slug?: string | null;
    tenant?: { slug?: string | null; custom_domain?: string | null } | null;
  } | null;
}) {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://iwacumo.com").replace(/\/+$/, "");
  const publisher = book.publisher;
  const customDomain = publisher?.custom_domain || publisher?.tenant?.custom_domain || null;
  const tenantSlug = publisher?.tenant?.slug || publisher?.slug || null;

  if (customDomain) {
    const normalizedCustomDomain = /^https?:\/\//i.test(customDomain)
      ? customDomain
      : `https://${customDomain}`;
    return {
      storeLabel: customDomain.replace(/^https?:\/\//i, ""),
      storeUrl: normalizedCustomDomain,
    };
  }

  if (tenantSlug) {
    return {
      storeLabel: tenantSlug,
      storeUrl: `${appUrl}/store/${tenantSlug}`,
    };
  }

  return {
    storeLabel: "Iwacumo",
    storeUrl: appUrl,
  };
}

async function getBookSettings() {
  const settingsRaw = await prisma.systemSettings.findMany();
  const settingsMap: Record<string, any> = {};
  settingsRaw.forEach((s) => { settingsMap[s.key] = s.value; });

  return {
    printing_costs: settingsMap.printing_costs ?? null,
    platform_fee: {
      type: settingsMap.platform_fee?.type ?? "percentage",
      value: normalisePrimitive(settingsMap.platform_fee?.value, 30),
    },
    default_markup: normalisePrimitive(settingsMap.default_markup, 20),
    book_weights: settingsMap.book_weights ?? null,
    book_feature_toggles: normalizeBookFeatureToggles(settingsMap.book_feature_toggles),
    book_size_ranges: normalizeBookSizeRanges(settingsMap.book_size_ranges),
    book_flap_costs: normalizeBookFlapCosts(settingsMap.book_flap_costs),
    book_live_pricing_enabled: normalizeBookLivePricingEnabled(settingsMap.book_live_pricing_enabled),
    book_custom_fields: settingsMap.book_custom_fields ?? [],
    ai_chapter_extraction: settingsMap.ai_chapter_extraction ?? { enabled: false },
  };
}

function resolveVariantDimensions(input: {
  size?: string | null;
  trim_size_mode?: string | null;
  custom_width_in?: number | null;
  custom_height_in?: number | null;
  sizeRanges: ReturnType<typeof normalizeBookSizeRanges>;
}) {
  if (input.trim_size_mode === "custom") {
    const width = input.custom_width_in ?? null;
    const height = input.custom_height_in ?? null;

    if (!width || !height) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Please enter the custom width and height for this book.",
      });
    }

    const matchedBucket = matchSizeBucket(width, height, input.sizeRanges);
    if (!matchedBucket) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "This custom size does not fit our supported print sizes. Please adjust the dimensions and try again.",
      });
    }

    return {
      sizeBucket: matchedBucket,
      displayWidthIn: width,
      displayHeightIn: height,
      customWidthIn: width,
      customHeightIn: height,
    };
  }

  const standardSize = (input.size as "A6" | "A5" | "A4" | undefined) ?? "A5";
  const standardDimensions = STANDARD_SIZE_DIMENSIONS_IN[standardSize];

  return {
    sizeBucket: standardSize,
    displayWidthIn: standardDimensions.width,
    displayHeightIn: standardDimensions.height,
    customWidthIn: null,
    customHeightIn: null,
  };
}

const MAMMOTH_STYLE_MAP = [
  "p[style-name='Heading 1'] => h1:fresh",
  "p[style-name='Heading 2'] => h2:fresh",
  "p[style-name='Heading 3'] => h3:fresh",
  "p[style-name='Heading 4'] => h4:fresh",
  "p[style-name='Heading 5'] => h5:fresh",
  "p[style-name='Heading 6'] => h6:fresh",
];

export const DOCX_IMAGE_PLACEHOLDER =
  '<span data-docx-image-placeholder="true">[Image omitted]</span>';

async function convertDocxToHtml(buffer: Buffer) {
  let imageCount = 0;
  const result = await mammoth.convertToHtml(
    { buffer },
    {
      styleMap: MAMMOTH_STYLE_MAP,
      convertImage: mammoth.images.imgElement(async (image) => {
        imageCount += 1;
        return { src: "about:blank" };
      }),
    },
  );

  const html = result.value.replace(
    /<img\b[^>]*src=["']about:blank["'][^>]*>/gi,
    DOCX_IMAGE_PLACEHOLDER,
  );

  console.log(`[DOCX] Converted HTML and skipped ${imageCount} embedded images`);
  return { ...result, value: html, imageCount };
}

const CHAPTER_NUMBER_PATTERN = /^chapter\s+[\divxlcdm\d]+[.:]?\s*$/i;

function isChapterNumberText(text: string): boolean {
  return CHAPTER_NUMBER_PATTERN.test(text.trim());
}

function extractTextFromHtml(html: string): string {
  return html.replace(/<[^>]+>/g, "").trim();
}

function splitOnHeadings(html: string): string[] {
  return html.split(/(?=<h[1-6][^>]*>)/i).filter(Boolean);
}

function splitOnChapterParagraphs(html: string): string[] {
  const pattern = /(?=<p[^>]*>\s*(?:<(?:strong|b)[^>]*>\s*)?chapter\s+[\divxlcdm\d]+[.:]?\s*(?:\s*<\/(?:strong|b)>)?\s*<\/p>)/gi;
  return html.split(pattern).filter(Boolean);
}

function extractTitle(section: string, fallbackIndex: number): string {
  const text = extractTextFromHtml(section);

  if (isChapterNumberText(text)) {
    return `Chapter ${fallbackIndex + 1}`;
  }

  const headingPattern = /<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi;
  let match: RegExpExecArray | null;
  while ((match = headingPattern.exec(section)) !== null) {
    const headingText = match[1].replace(/<[^>]+>/g, "").trim();
    if (!isChapterNumberText(headingText)) {
      return headingText;
    }
  }

  const boldPattern = /<(?:strong|b)[^>]*>(.*?)<\/(?:strong|b)>/gi;
  while ((match = boldPattern.exec(section)) !== null) {
    const boldText = match[1].replace(/<[^>]+>/g, "").trim();
    if (boldText.length > 0 && !isChapterNumberText(boldText)) {
      return boldText;
    }
  }

  const chapterMatch = text.match(/chapter\s+([\divxlcdm\d]+)[.:]?/i);
  if (chapterMatch) {
    return `Chapter ${chapterMatch[1].toUpperCase()}`;
  }

  const firstLine = text.split("\n")[0]?.trim();
  if (firstLine && firstLine.length <= 100) {
    return firstLine;
  }

  return `Chapter ${fallbackIndex + 1}`;
}

function romanToArabic(roman: string): number {
  const map: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let result = 0;
  for (let i = 0; i < roman.length; i++) {
    const current = map[roman[i].toUpperCase()] || 0;
    const next = map[roman[i + 1]?.toUpperCase() ?? ""] || 0;
    if (next > current) {
      result += next - current;
      i++;
    } else {
      result += current;
    }
  }
  return result;
}

function extractChapterNumber(section: string, fallbackIndex: number): number {
  const text = extractTextFromHtml(section);
  const match = text.match(/chapter\s+([\divxlcdm\d]+)[.:]?/i);
  if (match) {
    const num = match[1];
    if (/^[ivxlcdm]+$/i.test(num)) {
      return romanToArabic(num.toUpperCase());
    }
    return parseInt(num, 10) || fallbackIndex;
  }
  return fallbackIndex;
}

function mergeChapterWithNextTitle(sections: string[]): string[] {
  const merged: string[] = [];
  let i = 0;

  while (i < sections.length) {
    const currentSection = sections[i];
    const currentText = extractTextFromHtml(currentSection);

    if (isChapterNumberText(currentText) && i + 1 < sections.length) {
      const nextSection = sections[i + 1];
      const nextText = extractTextFromHtml(nextSection);

      if (!isChapterNumberText(nextText)) {
        merged.push(currentSection + nextSection);
        i += 2;
        continue;
      }
    }

    merged.push(currentSection);
    i++;
  }

  return merged;
}

const aiDocumentSchema = z.object({
  sections: z.array(z.object({
    type: z.enum(["front_matter", "chapter", "back_matter"]),
    title: z.string(),
    chapter_number: z.number(),
    start_marker: z.string(),
  })),
});

export type ExtractedChapter = {
  title: string;
  content: string;
  chapter_number: number;
  section_type: "front_matter" | "chapter" | "back_matter";
  sort_order: number;
  word_count: number;
};

const AI_TIMEOUT_MS = 45000;
const AI_CHUNK_SIZE = 40000;
const AI_CHUNK_OVERLAP = 2000;

function buildHtmlPositionMap(html: string): { plainText: string; textToHtml: number[] } {
  let plainText = "";
  const textToHtml: number[] = [];
  let inTag = false;

  for (let i = 0; i < html.length; i++) {
    const ch = html[i];
    if (ch === "<") { inTag = true; continue; }
    if (ch === ">") { inTag = false; continue; }
    if (inTag) continue;

    textToHtml[plainText.length] = i;
    plainText += ch;
  }

  return { plainText, textToHtml };
}

function textPosToHtmlPos(textToHtml: number[], textPos: number): number {
  if (textPos >= textToHtml.length) return textToHtml[textToHtml.length - 1] || 0;
  return textToHtml[textPos] || 0;
}

async function callAI(
  plainText: string,
  provider: ReturnType<typeof getAIChapterProvider>,
  modelName: string,
  timeoutMs: number,
): Promise<z.infer<typeof aiDocumentSchema>["sections"]> {
  const result = await Promise.race([
    generateObject({
      model: provider.chat(modelName),
      schema: aiDocumentSchema,
      temperature: 0,
      system: `You are a precise book document parser. Identify ALL sections of a book — front matter, chapters, and back matter.`,
      prompt: `Analyze this book text and identify ALL sections in their EXACT order.

For EACH section return:
- "type": "front_matter" | "chapter" | "back_matter"
- "title": The section's title (e.g., "Dedication", "MOUNT MUBI", "Acknowledgments")
- "chapter_number": Actual chapter number from the text, or 0 for non-chapters
- "start_marker": Copy VERBATIM the EXACT heading text that marks the START of this section. Must be an exact, unique substring from the original text.

Rules:
1. Include EVERYTHING — title pages, dedications, forewords, ALL chapters, epilogues, afterwords
2. Front matter = everything before Chapter 1. Back matter = everything after last chapter.
3. start_marker is the heading/separator that marks section start. For chapters use "Chapter 1" or the actual heading text like "Chapter 1 MOUNT MUBI" — whatever distinct text signals a new chapter. For front matter, the first section does NOT need a marker (it starts at position 0).
4. Use ACTUAL chapter numbers from the text
5. Return ONLY JSON — no explanations

Text to parse:
${plainText}`,
    }),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("AI_TIMEOUT")), timeoutMs)
    ),
  ]);

  return result.object.sections;
}

async function callAIChunked(
  plainText: string,
  provider: ReturnType<typeof getAIChapterProvider>,
  modelName: string,
): Promise<z.infer<typeof aiDocumentSchema>["sections"]> {
  const chunks: { text: string; offset: number }[] = [];
  let pos = 0;
  while (pos < plainText.length) {
    const end = Math.min(pos + AI_CHUNK_SIZE, plainText.length);
    chunks.push({ text: plainText.substring(pos, end), offset: pos });
    pos = end - AI_CHUNK_OVERLAP;
  }

  console.log(`[AI Chunked] Split ${plainText.length} chars into ${chunks.length} chunks`);

  const CONCURRENCY = 3;
  const allResults: (z.infer<typeof aiDocumentSchema>["sections"][number] & { _offset: number })[] = [];

  for (let i = 0; i < chunks.length; i += CONCURRENCY) {
    const batch = chunks.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (chunk, batchIdx) => {
        const chunkNum = i + batchIdx + 1;
        console.log(`[AI Chunked] Processing chunk ${chunkNum}/${chunks.length} (${chunk.text.length} chars)`);
        const sections = await callAI(chunk.text, provider, modelName, 30000);
        console.log(`[AI Chunked] Chunk ${chunkNum} returned ${sections.length} sections`);
        return sections.map(s => ({ ...s, _offset: chunk.offset }));
      })
    );
    allResults.push(...results.flat());
  }

  const seen = new Set<string>();
  const deduped: typeof allResults = [];
  for (const s of allResults) {
    const key = `${s.type}|${s.title}|${s.chapter_number}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(s);
    }
  }

  console.log(`[AI Chunked] Total ${deduped.length} unique sections across all chunks`);
  return deduped;
}

export async function extractChaptersWithAI(docxUrl: string, config: { provider: string; model: string }): Promise<ExtractedChapter[]> {
  console.log(`[extractChaptersWithAI] Starting — provider: ${config.provider}, model: ${config.model}`);

  const response = await axios.get(docxUrl, { responseType: "arraybuffer" });
  const docxBuffer = Buffer.isBuffer(response.data) ? response.data : Buffer.from(response.data);
  console.log(`[DOCX] Downloaded ${docxBuffer.byteLength} bytes for AI extraction`);
  const result = await convertDocxToHtml(docxBuffer);
  const fullHtml = result.value;
  console.log(`[extractChaptersWithAI] DOCX converted to ${fullHtml.length} chars of HTML`);

  if (result.messages.length > 0) {
    console.log("[extractChaptersWithAI] Mammoth messages:", result.messages);
  }

  const { plainText, textToHtml } = buildHtmlPositionMap(fullHtml);
  console.log(`[extractChaptersWithAI] Plain text: ${plainText.length} chars`);

  const provider = getAIChapterProvider({ provider: config.provider });
  const modelName = getAIModel({ model: config.model });

  let sections: z.infer<typeof aiDocumentSchema>["sections"];

  try {
    console.log(`[extractChaptersWithAI] Phase 1: single call with ${AI_TIMEOUT_MS / 1000}s timeout`);
    sections = await callAI(plainText, provider, modelName, AI_TIMEOUT_MS);
    console.log(`[extractChaptersWithAI] Phase 1 SUCCESS: ${sections.length} sections`);
  } catch (error: any) {
    if (error.message === "AI_TIMEOUT") {
      console.log(`[extractChaptersWithAI] Phase 1 timed out, starting Phase 2: chunked processing`);
      const chunked = await callAIChunked(plainText, provider, modelName);
      sections = chunked.map(s => ({ type: s.type, title: s.title, chapter_number: s.chapter_number, start_marker: s.start_marker }));
      console.log(`[extractChaptersWithAI] Phase 2 SUCCESS: ${sections.length} sections`);
    } else {
      console.error(`[extractChaptersWithAI] Phase 1 error:`, error);
      throw error;
    }
  }

  // Find text positions of each section heading
  const boundaries: { textPos: number; section: typeof sections[number] }[] = [];
  let lastTextPos = 0;

  // First section starts at 0 if it's front matter, otherwise from first marker
  if (sections.length > 0 && sections[0].type === "front_matter") {
    boundaries.push({ textPos: 0, section: sections[0] });
  }

  for (let i = (boundaries.length > 0 ? 1 : 0); i < sections.length; i++) {
    const s = sections[i];
    let pos = plainText.indexOf(s.start_marker, lastTextPos + 1);
    if (pos === -1) {
      pos = plainText.indexOf(s.start_marker.substring(0, 30), lastTextPos + 1);
    }
    if (pos === -1) {
      console.warn(`[extractChaptersWithAI] Marker not found for "${s.title}", placing sequentially`);
      pos = lastTextPos + 1;
    }

    boundaries.push({ textPos: pos, section: s });
    lastTextPos = pos;
  }

  // Map text positions to HTML positions and split
  const htmlBoundaries = boundaries.map(b => textPosToHtmlPos(textToHtml, b.textPos));

  const chapterResults: ExtractedChapter[] = [];

  for (let i = 0; i < htmlBoundaries.length; i++) {
    const startHtmlPos = htmlBoundaries[i];
    const endHtmlPos = i + 1 < htmlBoundaries.length ? htmlBoundaries[i + 1] : fullHtml.length;
    const content = fullHtml.substring(startHtmlPos, endHtmlPos).trim();
    const wordCount = extractTextFromHtml(content).split(/\s+/).filter(Boolean).length;

    const s = boundaries[i].section;

    let chapterNumber: number;
    if (s.type === "chapter") {
      chapterNumber = s.chapter_number;
    } else if (s.type === "front_matter") {
      chapterNumber = 0;
    } else {
      chapterNumber = 0;
    }

    console.log(`[extractChaptersWithAI] ${s.type} #${chapterNumber}: "${s.title}" (${wordCount} words)`);

    chapterResults.push({
      title: s.title,
      content,
      chapter_number: chapterNumber,
      section_type: s.type,
      sort_order: i,
      word_count: wordCount,
    });
  }

  return chapterResults;
}

export async function extractChaptersFromDocx(docxUrl?: string | null): Promise<ExtractedChapter[]> {
  if (!docxUrl) return [];

  try {
    const response = await axios.get(docxUrl, { responseType: "arraybuffer" });
    const docxBuffer = Buffer.isBuffer(response.data) ? response.data : Buffer.from(response.data);
    console.log(`[DOCX] Downloaded ${docxBuffer.byteLength} bytes for standard extraction`);
    const result = await convertDocxToHtml(docxBuffer);
    const fullHtml = result.value;

    console.log("[extractChaptersFromDocx] HTML length:", fullHtml.length);
    console.log("[extractChaptersFromDocx] First 500 chars:", fullHtml.substring(0, 500));

    if (result.messages.length > 0) {
      console.log("[extractChaptersFromDocx] Mammoth messages:", result.messages);
    }

    let sections = splitOnHeadings(fullHtml);
    console.log("[extractChaptersFromDocx] After heading split:", sections.length, "sections");

    if (sections.length <= 1) {
      sections = splitOnChapterParagraphs(fullHtml);
      console.log("[extractChaptersFromDocx] After chapter paragraph split:", sections.length, "sections");
    }

    const mergedSections = mergeChapterWithNextTitle(sections);
    console.log("[extractChaptersFromDocx] After merge:", mergedSections.length, "sections");

    if (mergedSections.length === 0) {
      console.log("[extractChaptersFromDocx] No sections found, returning empty");
      return [];
    }

    return mergedSections.map((section, index) => {
      const title = extractTitle(section, index);
      const chapterNumber = extractChapterNumber(section, index + 1);
      const wordCount = extractTextFromHtml(section).split(/\s+/).filter(Boolean).length;

      console.log(`[extractChaptersFromDocx] Chapter ${chapterNumber}: "${title}" (${wordCount} words)`);

      return {
        title,
        content: section,
        chapter_number: chapterNumber,
        section_type: "chapter",
        sort_order: index,
        word_count: wordCount,
      };
    });
  } catch (error) {
    console.error("Failed to parse DOCX for chapter extraction:", error);
    return [];
  }
}

export async function enqueueBookDocumentProcessing(bookId: string) {
  const job = await prisma.documentProcessingJob.upsert({
    where: { book_id: bookId },
    update: {
      status: "queued",
      progress: 0,
      completed_steps: 0,
      images_skipped: 0,
      error_message: null,
      started_at: null,
      completed_at: null,
    },
    create: { book_id: bookId },
  });

  await send("book-document-processing", { bookId, jobId: job.id }, {
    retentionSeconds: 7 * 24 * 60 * 60,
    idempotencyKey: `book-document-processing:${job.id}:${job.updated_at.getTime()}`,
  });

  return job;
}

export async function processBookDocument(jobId: string, bookId: string) {
  const job = await prisma.documentProcessingJob.update({
    where: { id: jobId },
    data: {
      status: "processing",
      attempt_count: { increment: 1 },
      started_at: new Date(),
      error_message: null,
    },
  });

  try {
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      select: { id: true, text_url: true },
    });
    if (!book?.text_url) {
      throw new Error("This book has no DOCX document to process.");
    }

    const settings = await getBookSettings();
    const aiConfig = settings.ai_chapter_extraction as { enabled?: boolean; provider?: string; model?: string } | undefined;
    const extracted = aiConfig?.enabled
      ? await extractChaptersWithAI(book.text_url, {
          provider: aiConfig.provider || "openrouter",
          model: aiConfig.model || "~anthropic/claude-sonnet-latest",
        })
      : await extractChaptersFromDocx(book.text_url);
    const imagesSkipped = extracted.reduce(
      (count, chapter) => count + chapter.content.split(DOCX_IMAGE_PLACEHOLDER).length - 1,
      0,
    );

    await prisma.$transaction(async (tx) => {
      await tx.chapter.deleteMany({ where: { book_id: book.id } });
      if (extracted.length > 0) {
        await tx.chapter.createMany({
          data: extracted.map((chapter) => ({ ...chapter, book_id: book.id })),
        });
      }
      await tx.documentProcessingJob.update({
        where: { id: job.id },
        data: {
          status: "completed",
          progress: 100,
          completed_steps: 1,
          total_steps: 1,
          images_skipped: imagesSkipped,
          completed_at: new Date(),
        },
      });
    });

    return { book_id: book.id, sections: extracted.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Document processing failed.";
    await prisma.documentProcessingJob.update({
      where: { id: job.id },
      data: { status: "failed", error_message: message },
    });
    throw error;
  }
}

export const getDocumentProcessingStatus = publicProcedure
  .input(z.object({ book_id: z.string() }))
  .query(async ({ input }) => {
    return prisma.documentProcessingJob.findUnique({ where: { book_id: input.book_id } });
  });

export const retryDocumentProcessing = publicProcedure
  .input(z.object({ book_id: z.string() }))
  .mutation(async ({ input }) => enqueueBookDocumentProcessing(input.book_id));

function computePhysicalPrice(params: {
  format: "paperback" | "hardcover";
  sizeBucket: "A6" | "A5" | "A4";
  pageCount: number;
  flapType?: string | null;
  authorMarkupType?: string | null;
  authorMarkupValue?: number | null;
  specialAddonFee?: number | null;
  settings: Awaited<ReturnType<typeof getBookSettings>>;
}) {
  const sizePricing = params.settings.printing_costs?.[params.format]?.[params.sizeBucket];
  if (!sizePricing) return 0;

  const flapCost = getFlapCost(params.flapType, params.sizeBucket, params.settings.book_flap_costs);
  const basePrintCost =
    sizePricing.cover +
    (sizePricing.page * params.pageCount) +
    flapCost +
    (params.specialAddonFee ?? 0);

  const platformFee =
    params.settings.platform_fee.type === "flat"
      ? params.settings.platform_fee.value
      : basePrintCost * (params.settings.platform_fee.value / 100);

  const defaultMarkup = basePrintCost * (params.settings.default_markup / 100);
  const baseCost = basePrintCost + platformFee + defaultMarkup;
  const authorMarkup =
    params.authorMarkupType === "flat"
      ? (params.authorMarkupValue ?? 0)
      : baseCost * ((params.authorMarkupValue ?? 0) / 100);

  return roundUp100(baseCost + authorMarkup);
}

function decorateBookForResponse(book: any, settings: Awaited<ReturnType<typeof getBookSettings>>) {
  const metadata = book.metadata && typeof book.metadata === "object" ? book.metadata : {};
  const customFields = getCustomFieldValueMap(metadata);
  const variantsByFormat = new Map<string, any>();

  for (const variant of book.variants ?? []) {
    const current = variantsByFormat.get(variant.format);
    const variantTime = new Date(variant.updated_at ?? variant.created_at ?? 0).getTime();
    const currentTime = current ? new Date(current.updated_at ?? current.created_at ?? 0).getTime() : -1;

    if (!current || variantTime >= currentTime) {
      variantsByFormat.set(variant.format, variant);
    }
  }

  const variants = Array.from(variantsByFormat.values()).map((variant: any) => {
    if (variant.format !== "paperback" && variant.format !== "hardcover") {
      return variant;
    }

    const sizeBucket = (variant.size_bucket || variant.size || "A5") as "A6" | "A5" | "A4";
    const computedPrice = settings.book_live_pricing_enabled
      ? computePhysicalPrice({
          format: variant.format,
          sizeBucket,
          pageCount: book.page_count ?? 0,
          flapType: variant.flap_type,
          authorMarkupType: book.author_markup_type,
          authorMarkupValue: book.author_markup_value,
          specialAddonFee: book.special_addon_fee,
          settings,
        })
      : variant.list_price;

    return {
      ...variant,
      size_bucket: sizeBucket,
      list_price: computedPrice,
      computed_list_price: computedPrice,
      display_dimensions_label: formatDimensionsInches(variant.display_width_in, variant.display_height_in),
    };
  });

  return {
    ...book,
    metadata: {
      ...(metadata as Record<string, any>),
      custom_fields: customFields,
    },
    variants,
    issue_report_count: book.issue_reports?.length ?? 0,
  };
}

export const createBook = publicProcedure.input(createBookSchema).mutation(async (opts) => {
  console.log("[createBook] VERSION: memory-safe-docx-images");
  console.log("[createBook] AI env — OPENAI_API_KEY:", process.env.OPENAI_API_KEY ? `present (${process.env.OPENAI_API_KEY.length} chars)` : "missing");
  console.log("[createBook] AI env — OPENROUTER_API_KEY:", process.env.OPENROUTER_API_KEY ? `present (${process.env.OPENROUTER_API_KEY.length} chars)` : "missing");
  const session = await auth();

  if (!session) {
    console.error("User session not found");
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Please sign in and try again." });
  }

  // Fetch creator with full context for ID resolution
  const creator = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { publisher: true, author: true },
  });

  if (!creator) {
    throw new TRPCError({ code: "NOT_FOUND", message: "We could not find your account details. Please refresh and try again." });
  }

  // --- CONTEXT RESOLUTION ---
  // Resolve Publisher: Provided ID > Creator's Publisher ID > Creator's Author's Publisher ID
  // const publisherId = opts.input.publisher_id || creator.publisher?.id || creator.author?.publisher_id;
  
  // Resolve Author: Provided Primary > Provided Author > Creator's Author ID
  const primaryAuthorId = opts.input.primary_author_id || opts.input.author_id || creator.author?.id;

  let publisherId = opts.input.publisher_id || creator.publisher?.id || creator.author?.publisher_id;

  // if (!publisherId) {
  //   throw new TRPCError({ code: "BAD_REQUEST", message: "Could not resolve Publisher context" });
  // }

  if (!publisherId) {
    const platformPublisher = await prisma.publisher.findUnique({
      where: { slug: "booka" }
    });
    publisherId = platformPublisher?.id;
  }

  if (!publisherId) {
    throw new TRPCError({ 
      code: "BAD_REQUEST", 
      message: "We could not link this book to a publisher yet. Please refresh and try again." 
    });
  }

  if (!primaryAuthorId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Please choose an author for this book." });
  }

  // Validate if the resolved author exists
  const authorExists = await prisma.author.findUnique({
    where: { id: primaryAuthorId },
  });
  if (!authorExists) {
    throw new TRPCError({ code: "NOT_FOUND", message: "The selected author could not be found." });
  }

  if (session.activeProfile === "publisher" || session.activeProfile === "author") {
    const payoutGate = await resolveBookCreationPayoutStatus({
      sessionUserId: session.user.id,
      activeProfile: session.activeProfile,
      authorId: primaryAuthorId,
      publisherId,
    });

    if (!payoutGate.can_submit_with_selected_author) {
      const blockingDetails = payoutGate.blocking_entities_for_submit
        .map((entity) => `${entity.display_name}: ${entity.blocking_reason_labels.join(" ")}`)
        .join(" ");

      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Complete payout setup before adding this book. ${blockingDetails}`.trim(),
      });
    }
  }

  // After resolving publisherId/authorId, before prisma.$transaction
  const bookSettings = await getBookSettings();
  const bookWeights = bookSettings.book_weights ?? null;
  const resolvedDimensions = (opts.input.paper_back || opts.input.hard_cover)
    ? resolveVariantDimensions({
        size: opts.input.size,
        trim_size_mode: opts.input.trim_size_mode,
        custom_width_in: opts.input.custom_width_in ?? null,
        custom_height_in: opts.input.custom_height_in ?? null,
        sizeRanges: bookSettings.book_size_ranges,
      })
    : null;

  // --- VALIDATION ---
  const covers = [
    opts.input.book_cover,
    opts.input.book_cover2,
    opts.input.book_cover3,
    opts.input.book_cover4,
    opts.input.cover_image_url,
  ];
  
  const hasAtLeastOneCover = covers.some(
    (cover) => cover && typeof cover === "string" && cover.trim() !== ""
  );

  if (!hasAtLeastOneCover) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Please upload the main front cover for this book." });
  }

  const hasVariants = opts.input.variants && opts.input.variants.length > 0;
  const hasLegacyFormats = opts.input.paper_back || opts.input.e_copy || opts.input.hard_cover;
  
  if (!hasVariants && !hasLegacyFormats) {
    throw new TRPCError({ 
      code: "BAD_REQUEST", 
      message: "Please choose at least one format for this book." 
    });
  }

  if ((opts.input.paper_back || opts.input.hard_cover) && !opts.input.pdf_url) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Please upload the print-ready PDF for your physical book.",
    });
  }

  const docxSourceUrl = opts.input.text_url ?? opts.input.docx_url ?? null;
  if (opts.input.e_copy && !opts.input.ebook_pdf_url && !docxSourceUrl) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Please upload an ebook PDF, a DOCX reader file, or both.",
    });
  }
  console.log(`[AI] createBook DOCX processing queued:`, docxSourceUrl ? "yes" : "no");

  const tagArray = opts.input.tags
    ? opts.input.tags.split("*").map(tag => tag.trim())
    : opts.input.subject_tags || [];
  const metadata = {
    custom_fields: opts.input.custom_fields ?? {},
    private_creator_notes: opts.input.admin_private_notes ?? null,
  };

  // --- DATABASE TRANSACTION ---
  const createdBook = await prisma.$transaction(async (tx) => {
    // 1. Create the book using 'connect' for all relations
    const createdBook = await tx.book.create({
      data: {
        title: opts.input.title ?? "",
        subtitle: (opts.input.subtitle ?? null) as any,
        isbn: opts.input.isbn || null,
        slug: opts.input.slug ?? null,
        description: opts.input.description ?? opts.input.short_description ?? null,
        synopsis: opts.input.synopsis ?? opts.input.long_description ?? null,
        cover_image_url: opts.input.cover_image_url ?? opts.input.book_cover ?? null,
        genre: opts.input.genre ?? null,
        subject_tags: tagArray,
        edition: opts.input.edition ?? null,
        publication_date: opts.input.publication_date ?? null,
        default_language: opts.input.default_language ?? "en",
        page_count: opts.input.page_count ?? null,
        reading_age_min: opts.input.reading_age_min ?? null,
        reading_age_max: opts.input.reading_age_max ?? null,
        status: opts.input.status ?? "draft",
        short_description: opts.input.short_description ?? null,
        long_description: opts.input.long_description ?? null,
        price: opts.input.price ?? 0,
        tags: tagArray,
        paper_back: opts.input.paper_back ?? false,
        e_copy: opts.input.e_copy ?? false,
        hard_cover: opts.input.hard_cover ?? false,
        published: opts.input.published ?? false,
        metadata,
        author_markup_type: opts.input.author_markup_type ?? "percentage",
        author_markup_value: opts.input.author_markup_value ?? 0,
        special_addon_fee: opts.input.special_addon_fee ?? 0,
        special_addon_description: opts.input.special_addon_description ?? null,
        
        book_cover: opts.input.book_cover ?? null,
        book_cover2: opts.input.book_cover2 ?? null,
        book_cover3: opts.input.book_cover3 ?? null,
        book_cover4: opts.input.book_cover4 ?? null,
        featured: opts.input.featured ?? false,
        pdf_url: opts.input.pdf_url ?? "",
        ebook_pdf_url: opts.input.ebook_pdf_url ?? "",
        text_url: opts.input.docx_url ?? opts.input.text_url ?? "",
        // Relation connections
        categories: {
          connect: opts.input.category_ids?.map(id => ({ id })) || []
        },

        publisher: {
          connect: { id: publisherId },
        },
        author: {
          connect: { id: primaryAuthorId },
        },
        primary_author: {
          connect: { id: primaryAuthorId },
        },
      },
    });

    // 2. Handle Variants: Priority to 'variants' array, fallback to legacy flags
    if (hasVariants) {
      await (tx as any).bookVariant.createMany({
        data: opts.input.variants!.map((variant) => ({
          book_id: createdBook.id,
          format: variant.format,
          size: variant.size ?? resolvedDimensions?.sizeBucket ?? null,
          size_bucket: variant.size_bucket ?? resolvedDimensions?.sizeBucket ?? null,
          trim_size_mode: variant.trim_size_mode ?? opts.input.trim_size_mode ?? "standard",
          paper_type: variant.paper_type ?? opts.input.paper_type ?? null,
          lamination_type: variant.lamination_type ?? opts.input.lamination_type ?? null,
          flap_type: variant.flap_type ?? opts.input.flap_type ?? "none",
          custom_width_in: variant.custom_width_in ?? resolvedDimensions?.customWidthIn ?? null,
          custom_height_in: variant.custom_height_in ?? resolvedDimensions?.customHeightIn ?? null,
          display_width_in: variant.display_width_in ?? resolvedDimensions?.displayWidthIn ?? null,
          display_height_in: variant.display_height_in ?? resolvedDimensions?.displayHeightIn ?? null,
          isbn13: variant.isbn13 ?? null,
          language: variant.language ?? "en",
          list_price: variant.list_price,
          currency: variant.currency ?? "USD",
          discount_price: variant.discount_price ?? null,
          stock_quantity: variant.stock_quantity ?? 0,
          sku: variant.sku ?? null,
          digital_asset_url: variant.digital_asset_url ?? null,
          weight_grams: variant.weight_grams 
            ?? computeWeightGrams(
              variant.format,
              variant.size_bucket ?? variant.size ?? resolvedDimensions?.sizeBucket,
              opts.input.page_count ?? 0,
              bookWeights
            ),
          dimensions: variant.dimensions ?? null,
          status: variant.status ?? "active",
        })),
      });
    } else {
      const legacyVariants: Array<{ format: string; price: number }> = [];
      if (opts.input.paper_back) {
        legacyVariants.push({ format: "paperback", price: opts.input.paperback_price ?? opts.input.price ?? 0 });
      }
      if (opts.input.hard_cover) {
        legacyVariants.push({ format: "hardcover", price: opts.input.hardcover_price ?? opts.input.price ?? 0 });
      }
      if (opts.input.e_copy) {
        legacyVariants.push({ format: "ebook", price: opts.input.ebook_price ?? opts.input.price ?? 0 });
      }

      if (legacyVariants.length > 0) {
        await (tx as any).bookVariant.createMany({
          data: legacyVariants.map((v) => ({
            book_id: createdBook.id,
            format: v.format,
            size: resolvedDimensions?.sizeBucket ?? opts.input.size ?? null,
            size_bucket: resolvedDimensions?.sizeBucket ?? opts.input.size ?? null,
            trim_size_mode: opts.input.trim_size_mode ?? "standard",
            paper_type: opts.input.paper_type ?? null,
            lamination_type: opts.input.lamination_type ?? null,
            flap_type: opts.input.flap_type ?? "none",
            custom_width_in: resolvedDimensions?.customWidthIn ?? null,
            custom_height_in: resolvedDimensions?.customHeightIn ?? null,
            display_width_in: resolvedDimensions?.displayWidthIn ?? null,
            display_height_in: resolvedDimensions?.displayHeightIn ?? null,
            weight_grams: computeWeightGrams(
              v.format,
              resolvedDimensions?.sizeBucket ?? opts.input.size,
              opts.input.page_count ?? 0,
              bookWeights
            ),
            language: opts.input.default_language ?? "en",
            list_price: v.price,
            currency: "USD",
            stock_quantity: 0,
            status: "active",
          })),
        });
      }
    }

    return createdBook;
  }, {
      // Optional: Explicitly increase timeout to 20 seconds as a safety measure
      timeout: 20000 
    });

  if (docxSourceUrl) {
    try {
      await enqueueBookDocumentProcessing(createdBook.id);
    } catch (error) {
      console.error("[DOCX] Failed to enqueue document processing:", error);
    }
  }

  return createdBook;
  });

export const updateBook = publicProcedure.input(createBookSchema).mutation(async (opts) => {
  if (!opts.input.id) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "We could not find the book you want to update." });
  }

  const covers = [
    opts.input.book_cover,
    opts.input.book_cover2,
    opts.input.book_cover3,
    opts.input.book_cover4,
    opts.input.cover_image_url,
  ];
  
  if (!covers.some((c) => c && typeof c === "string" && c.trim() !== "")) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Please upload the main front cover for this book." });
  }

  const tagArray = opts.input.tags
    ? opts.input.tags.split("*").map(tag => tag.trim())
    : opts.input.subject_tags || [];
  const bookSettings = await getBookSettings();
  const resolvedDimensions = (opts.input.paper_back || opts.input.hard_cover)
    ? resolveVariantDimensions({
        size: opts.input.size,
        trim_size_mode: opts.input.trim_size_mode,
        custom_width_in: opts.input.custom_width_in ?? null,
        custom_height_in: opts.input.custom_height_in ?? null,
        sizeRanges: bookSettings.book_size_ranges,
      })
    : null;
  if ((opts.input.paper_back || opts.input.hard_cover) && !opts.input.pdf_url) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Please upload the print-ready PDF for your physical book.",
    });
  }
  const existingBook = await prisma.book.findUnique({
    where: { id: opts.input.id },
    select: {
      metadata: true,
      text_url: true,
      _count: { select: { chapters: true } },
    },
  });
  const docxSourceUrl = opts.input.text_url ?? opts.input.docx_url ?? null;
  if (opts.input.e_copy && !opts.input.ebook_pdf_url && !docxSourceUrl) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Please upload an ebook PDF, a DOCX reader file, or both.",
    });
  }
  const documentChanged = Boolean(docxSourceUrl && docxSourceUrl !== existingBook?.text_url);
  const shouldQueueDocument = Boolean(
    docxSourceUrl && (
      (existingBook?._count?.chapters ?? 0) === 0 ||
      documentChanged
    ),
  );
  console.log(`[AI] updateBook DOCX processing queued:`, shouldQueueDocument ? "yes" : "no");
  const metadata = {
    ...((existingBook?.metadata as Record<string, any> | null) ?? {}),
    custom_fields: opts.input.custom_fields ?? getCustomFieldValueMap(existingBook?.metadata),
    private_creator_notes:
      opts.input.admin_private_notes ??
      ((existingBook?.metadata as Record<string, any> | null)?.private_creator_notes ?? null),
  };

  const updatedBook = await prisma.$transaction(async (tx) => {
    const updatedBook = await tx.book.update({
      where: { id: opts.input.id },
      data: {
        title: opts.input.title,
        subtitle: (opts.input.subtitle ?? undefined) as any,
        isbn: opts.input.isbn || null,
        slug: opts.input.slug ?? undefined,
        description: opts.input.description ?? opts.input.short_description ?? undefined,
        synopsis: opts.input.synopsis ?? opts.input.long_description ?? undefined,
        cover_image_url: opts.input.cover_image_url ?? opts.input.book_cover ?? undefined,
        genre: opts.input.genre ?? undefined,
        subject_tags: tagArray,
        edition: opts.input.edition ?? undefined,
        publication_date: opts.input.publication_date ?? undefined,
        default_language: opts.input.default_language ?? undefined,
        page_count: opts.input.page_count ?? undefined,
        reading_age_min: opts.input.reading_age_min ?? undefined,
        reading_age_max: opts.input.reading_age_max ?? undefined,
        status: opts.input.status ?? undefined,
        short_description: opts.input.short_description ?? undefined,
        long_description: opts.input.long_description ?? undefined,
        price: opts.input.price ?? undefined,
        tags: tagArray,
        metadata,
        author_markup_type: opts.input.author_markup_type ?? "percentage",
        author_markup_value: opts.input.author_markup_value ?? 0,
        special_addon_fee: opts.input.special_addon_fee ?? 0,
        special_addon_description: opts.input.special_addon_description ?? null,
        paper_back: opts.input.paper_back ?? undefined,
        e_copy: opts.input.e_copy ?? undefined,
        hard_cover: opts.input.hard_cover ?? undefined,
        published: opts.input.published ?? undefined,
        pdf_url: opts.input.pdf_url ?? undefined,
        ebook_pdf_url: opts.input.ebook_pdf_url ?? undefined,
        text_url: opts.input.text_url ?? undefined,
        book_cover: opts.input.book_cover ?? undefined,
        book_cover2: opts.input.book_cover2 ?? undefined,
        book_cover3: opts.input.book_cover3 ?? undefined,
        book_cover4: opts.input.book_cover4 ?? undefined,
        featured: opts.input.featured ?? undefined,
        categories: {
          // 'set' replaces all existing categories with the new selection
          set: opts.input.category_ids?.map(id => ({ id })) || []
        },
        publisher: opts.input.publisher_id ? { connect: { id: opts.input.publisher_id } } : undefined,
        author: opts.input.author_id ? { connect: { id: opts.input.author_id } } : undefined,
        primary_author: opts.input.primary_author_id ? { connect: { id: opts.input.primary_author_id } } : undefined,
      },
    });

    // Handle Variants: Priority to 'variants' array, fallback to legacy flags
    if (opts.input.variants && opts.input.variants.length > 0) {
      const desiredVariants = Array.from(
        new Map(opts.input.variants.map((variant) => [variant.format, variant])).values()
      );
      const desiredFormats = desiredVariants.map((variant) => variant.format);
      const existingVariants = await (tx as any).bookVariant.findMany({
        where: { book_id: updatedBook.id },
        include: {
          _count: {
            select: { order_lineitems: true },
          },
        },
        orderBy: { updated_at: "desc" },
      });

      const keepIds = new Set<string>();

      for (const variant of desiredVariants) {
        const isPhysicalVariant = variant.format === "paperback" || variant.format === "hardcover";
        const existing =
          existingVariants.find((existingVariant: any) => existingVariant.id === variant.id) ??
          existingVariants.find((existingVariant: any) => existingVariant.format === variant.format);
        const variantData = {
          format: variant.format,
          size: isPhysicalVariant ? (variant.size ?? resolvedDimensions?.sizeBucket ?? undefined) : null,
          size_bucket: isPhysicalVariant ? (variant.size_bucket ?? resolvedDimensions?.sizeBucket ?? undefined) : null,
          trim_size_mode: isPhysicalVariant ? (variant.trim_size_mode ?? opts.input.trim_size_mode ?? undefined) : "standard",
          paper_type: isPhysicalVariant ? (variant.paper_type ?? opts.input.paper_type ?? undefined) : null,
          lamination_type: isPhysicalVariant ? (variant.lamination_type ?? opts.input.lamination_type ?? undefined) : null,
          flap_type: isPhysicalVariant ? (variant.flap_type ?? opts.input.flap_type ?? "none") : "none",
          custom_width_in: isPhysicalVariant ? (variant.custom_width_in ?? resolvedDimensions?.customWidthIn ?? undefined) : null,
          custom_height_in: isPhysicalVariant ? (variant.custom_height_in ?? resolvedDimensions?.customHeightIn ?? undefined) : null,
          display_width_in: isPhysicalVariant ? (variant.display_width_in ?? resolvedDimensions?.displayWidthIn ?? undefined) : null,
          display_height_in: isPhysicalVariant ? (variant.display_height_in ?? resolvedDimensions?.displayHeightIn ?? undefined) : null,
          isbn13: variant.isbn13 ?? undefined,
          language: variant.language ?? opts.input.default_language ?? undefined,
          list_price: variant.list_price,
          currency: variant.currency ?? undefined,
          discount_price: variant.discount_price ?? undefined,
          stock_quantity: variant.stock_quantity ?? undefined,
          sku: variant.sku ?? undefined,
          digital_asset_url: variant.digital_asset_url ?? undefined,
          weight_grams: variant.weight_grams ?? undefined,
          dimensions: variant.dimensions ?? undefined,
          status: variant.status ?? undefined,
        };

        if (existing) {
          keepIds.add(existing.id);
          await (tx as any).bookVariant.update({
            where: { id: existing.id },
            data: variantData,
          });
        } else {
          const createdVariant = await (tx as any).bookVariant.create({
            data: {
              ...variantData,
              book_id: updatedBook.id,
              currency: variant.currency ?? "USD",
              stock_quantity: variant.stock_quantity ?? 0,
              status: variant.status ?? "active",
            },
          });
          keepIds.add(createdVariant.id);
        }
      }

      for (const existingVariant of existingVariants) {
        const shouldRemove =
          (!desiredFormats.includes(existingVariant.format) || !keepIds.has(existingVariant.id)) &&
          existingVariant._count.order_lineitems === 0;

        if (shouldRemove) {
          await (tx as any).bookVariant.delete({ where: { id: existingVariant.id } });
        }
      }
    } else {
      // Fallback: Sync variants based on legacy boolean flags and prices
      const legacyFormats = [
        { key: 'paper_back', format: 'paperback', price: opts.input.paperback_price },
        { key: 'hard_cover', format: 'hardcover', price: opts.input.hardcover_price },
        { key: 'e_copy', format: 'ebook', price: opts.input.ebook_price },
      ] as const;

      for (const { key, format, price } of legacyFormats) {
        if (opts.input[key]) {
          // If format is checked: Update price or create variant
          const listPrice = (price || opts.input.price || 0);
          const existing = await (tx as any).bookVariant.findFirst({
            where: { book_id: updatedBook.id, format }
          });

          if (existing) {
            await (tx as any).bookVariant.update({
              where: { id: existing.id },
              data: { list_price: listPrice }
            });
          } else {
            await (tx as any).bookVariant.create({
              data: {
                book_id: updatedBook.id,
                format,
                size: resolvedDimensions?.sizeBucket ?? opts.input.size ?? null,
                size_bucket: resolvedDimensions?.sizeBucket ?? opts.input.size ?? null,
                trim_size_mode: opts.input.trim_size_mode ?? "standard",
                paper_type: opts.input.paper_type ?? null,
                lamination_type: opts.input.lamination_type ?? null,
                flap_type: opts.input.flap_type ?? "none",
                custom_width_in: resolvedDimensions?.customWidthIn ?? null,
                custom_height_in: resolvedDimensions?.customHeightIn ?? null,
                display_width_in: resolvedDimensions?.displayWidthIn ?? null,
                display_height_in: resolvedDimensions?.displayHeightIn ?? null,
                list_price: listPrice,
                language: opts.input.default_language ?? "en",
                currency: "USD",
                status: "active",
              }
            });
          }
        } else {
          // REMOVE: If the format is unchecked, delete the variant record entirely
          await (tx as any).bookVariant.deleteMany({
            where: { book_id: updatedBook.id, format }
          });
        }
      }
    }

    return updatedBook;
  });

  if (shouldQueueDocument) {
    try {
      await enqueueBookDocumentProcessing(updatedBook.id);
    } catch (error) {
      console.error("[DOCX] Failed to enqueue document processing on update:", error);
    }
  }

  return updatedBook;
});

export const deleteBook = publicProcedure.input(deleteBookSchema).mutation(async (opts) => {
  return await prisma.book.update({
    where: { id: opts.input.id },
    data: { deleted_at: new Date() },
  });
});

export const getAllBooks = publicProcedure.query(async ({ ctx }) => {
  // 1. Use the helper to resolve context (IDs and Roles)
  const userId = ctx.session?.user?.id;
  
  // Initialize defaults
  let isSuperAdmin = false;
  let publisherId: string | null = null;

  if (userId) {
    const userCtx = await resolveUserContext(userId);
    isSuperAdmin = userCtx.isSuperAdmin;
    publisherId = userCtx.publisher_id;
  }

  // 2. Fetch Books
  // If you want logged-out users to only see "published" books, 
  // you should add { published: true } to the where clause unless isSuperAdmin is true.
  const settings = await getBookSettings();
  const books = await prisma.book.findMany({
    where: { 
      deleted_at: null,
      status: { not: "archived" },
      // Optional: hide unpublished books from public if not an admin
      ...(isSuperAdmin ? {} : { published: true }) 
    },
    include: {
      chapters: {
        orderBy: [{ sort_order: "asc" }, { chapter_number: "asc" }, { created_at: "asc" }],
      },
      author: {
        include: {
          user: {
            select: {
              first_name: true,
              last_name: true,
            }
          }
        }
      },
      // publisher: true,
      categories: true,
      issue_reports: true,
      variants: {
        include: {
          _count: {
            select: { 
              order_lineitems: { 
                where: { order: { payment_status: "captured" } } 
              } 
            }
          }
        }
      }
    },
    orderBy: { created_at: "desc" }
  });

  // 3. Mapping for salesCount
  return books.map(book => {
    const totalSales = book.variants?.reduce((acc, variant) => {
      const count = variant._count?.order_lineitems || 0;
      return acc + count;
    }, 0) || 0;

    return {
      ...decorateBookForResponse(book, settings),
      salesCount: totalSales
    };
  });
});


// export const getBookById = publicProcedure.input(findBookByIdSchema).query(async (opts) => {
//   return await prisma.book.findUnique({
//     where: { id: opts.input.id, deleted_at: null },
//     include: { author: true, chapters: true, variants: true, publisher: true, categories: true }
//   });
// });

export const getCategories = publicProcedure.query(async () => {
  try {
    return await prisma.category.findMany({
      orderBy: {
        name: 'asc'
      }
    });
  } catch (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to fetch categories",
    });
  }
});


export const getBookById = publicProcedure
  .input(findBookByIdSchema)
  .query(async (opts) => {
    const session = await auth();
    const isSuperAdmin = session?.user?.id ? await checkIsSuperAdmin(session.user.id) : false;
    const roleNames = session?.roles?.map((role) => role.name.toLowerCase()) ?? [];
    const canViewInactiveBook = isSuperAdmin || roleNames.some((role) => ["publisher", "author"].includes(role));
    const settings = await getBookSettings();
    const book = await prisma.book.findUnique({
      where: { id: opts.input.id, deleted_at: null },
      include: {
        author: {
          include: {
            user: {               // ← needed for author email on approval
              select: {
                first_name: true,
                last_name: true,
                email: true,
              },
            },
          },
        },
        chapters: {
          orderBy: [{ sort_order: "asc" }, { chapter_number: "asc" }, { created_at: "asc" }],
        },
        variants: true,
        publisher: true,
        categories: true,
        issue_reports: {
          orderBy: { created_at: "desc" },
        },
      },
    });

    if (!book) return null;
    if (!canViewInactiveBook && isBookInactiveForPublic(book)) return null;
    return decorateBookForResponse(book, settings);
  });
 
// ─── Add approveBook anywhere alongside the other book mutations ──────────────
 
export const approveBook = publicProcedure
  .input(z.object({ id: z.string() }))
  .mutation(async ({ input }) => {
    const session = await auth();
    const roleNames = session?.roles?.map(r => r.name.toLowerCase()) ?? [];
    const canApprove = roleNames.some(r => r === "super-admin" || r.startsWith("staff-"));
    if (!canApprove) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can approve books." });
    }

    // 1. Fetch the book with enough context to send the email
    const book = await prisma.book.findUnique({
      where: { id: input.id, deleted_at: null },
      include: {
        author: {
          include: {
            user: {
              select: { first_name: true, email: true },
            },
          },
        },
      },
    });

    if (!book) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Book not found" });
    }

    if (book.published) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Book is already published",
      });
    }

    // 2. Approve — flip both flags atomically
    const approved = await prisma.book.update({
      where: { id: input.id },
      data: {
        published: true,
        status: "published",
        published_at: new Date(),
      },
    });
 
    // 3. Fire approval email — non-blocking, failure won't roll back the approval
    const authorEmail = book.author?.user?.email;
    const authorFirstName = book.author?.user?.first_name ?? "Author";
 
    if (authorEmail) {
      sendBookApprovedEmail({
        to: authorEmail,
        firstName: authorFirstName,
        bookTitle: book.title,
        bookId: book.id,
      }).catch((err: any) => {
        // Log but don't throw — email failure should never break approval
        console.error("[approveBook] Failed to send approval email:", err);
      });
    }
 
    return approved;
  });

export const denyBook = publicProcedure
  .input(z.object({
    id: z.string(),
    reviewerNotes: z.string().optional(),
  }))
  .mutation(async ({ input }) => {
    const session = await auth();
    const roleNames = session?.roles?.map(r => r.name.toLowerCase()) ?? [];
    const canDeny = roleNames.some(r => r === "super-admin" || r.startsWith("staff-"));
    if (!canDeny) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can deny books." });
    }

    const book = await prisma.book.findUnique({
      where: { id: input.id, deleted_at: null },
      include: {
        author: {
          include: {
            user: {
              select: { first_name: true, email: true },
            },
          },
        },
        publisher: {
          include: {
            user: {
              select: { first_name: true, email: true },
            },
          },
        },
      },
    });

    if (!book) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Book not found" });
    }

    const existingMetadata = book.metadata && typeof book.metadata === "object"
      ? (book.metadata as Record<string, any>)
      : {};
    const denied = await prisma.book.update({
      where: { id: input.id },
      data: {
        published: false,
        status: "draft",
        published_at: null,
        metadata: {
          ...existingMetadata,
          approval_denial: {
            reviewer_notes: input.reviewerNotes ?? null,
            denied_at: new Date().toISOString(),
          },
        },
      },
    });

    const recipients = [
      {
        email: book.author?.user?.email,
        firstName: book.author?.user?.first_name ?? "Author",
      },
      {
        email: book.publisher?.user?.email,
        firstName: book.publisher?.user?.first_name ?? "Publisher",
      },
    ].filter((recipient, index, all) =>
      recipient.email && all.findIndex((item) => item.email === recipient.email) === index
    );

    recipients.forEach((recipient) => {
      sendBookDeniedEmail({
        to: recipient.email!,
        firstName: recipient.firstName,
        bookTitle: book.title,
        reviewerNotes: input.reviewerNotes ?? null,
      }).catch((err: any) => {
        console.error("[denyBook] Failed to send denial email:", err);
      });
    });

    return denied;
  });

export const deactivateBook = publicProcedure
  .input(deleteBookSchema)
  .mutation(async ({ input }) => {
    const session = await auth();
    if (!session?.user?.id || !(await checkIsSuperAdmin(session.user.id))) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Only super admins can deactivate books." });
    }

    const book = await prisma.book.findUnique({
      where: { id: input.id, deleted_at: null },
      select: { id: true, metadata: true },
    });

    if (!book) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Book not found" });
    }

    const existingMetadata = book.metadata && typeof book.metadata === "object"
      ? (book.metadata as Record<string, any>)
      : {};

    return await prisma.book.update({
      where: { id: input.id },
      data: {
        published: false,
        status: "archived",
        metadata: {
          ...existingMetadata,
          deactivation: {
            deactivated_at: new Date().toISOString(),
          },
        },
      },
    });
  });

export const reactivateBook = publicProcedure
  .input(deleteBookSchema)
  .mutation(async ({ input }) => {
    const session = await auth();
    if (!session?.user?.id || !(await checkIsSuperAdmin(session.user.id))) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Only super admins can reactivate books." });
    }

    const book = await prisma.book.findUnique({
      where: { id: input.id, deleted_at: null },
      select: { id: true, published_at: true, metadata: true },
    });

    if (!book) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Book not found" });
    }

    const existingMetadata = book.metadata && typeof book.metadata === "object"
      ? (book.metadata as Record<string, any>)
      : {};
    const nextMetadata = { ...existingMetadata };
    delete nextMetadata.deactivation;

    return await prisma.book.update({
      where: { id: input.id },
      data: {
        published: !!book.published_at,
        status: book.published_at ? "published" : "draft",
        metadata: nextMetadata,
      },
    });
  });

export const getBookByAuthor = publicProcedure.input(findBookByIdSchema).query(async (opts) => {
  const settings = await getBookSettings();
  const user = await prisma.user.findUnique({
    where: { id: opts.input.id },
    include: { author: true, publisher: true }
  });

  const baseInclude = { 
    chapters: {
      orderBy: { sort_order: "asc" as const },
    },
    author: true, 
    categories: true,
    variants: {
      include: {
        _count: {
          select: { order_lineitems: true }
        },
        order_lineitems: {
          where: { order: { payment_status: "captured" } }
        }
      }
    }
    ,
    issue_reports: true,
  };

  if (user?.publisher) {
    const books = await prisma.book.findMany({
      where: { publisher_id: user.publisher.id, deleted_at: null },
      include: baseInclude
    });
    return books.map((book) => decorateBookForResponse(book, settings));
  }

  if (user?.author) {
    const books = await prisma.book.findMany({
      where: { author_id: user.author.id, deleted_at: null },
      include: baseInclude
    });
    return books.map((book) => decorateBookForResponse(book, settings));
  }
  return [];
});

export const toggleBookFeatured = publicProcedure.input(toggleFeaturedSchema).mutation(async ({ input }) => {
  const book = await prisma.book.findUnique({ where: { id: input.id } });
  if (!book) throw new TRPCError({ code: "NOT_FOUND", message: "Book not found" });

  return await prisma.book.update({
    where: { id: input.id },
    data: { featured: !book.featured },
  });
});

export const getAllFeaturedBooks = publicProcedure.query(async () => {
  return await prisma.book.findMany({
    where: { featured: true, deleted_at: null, published: true, status: { not: "archived" } },
     include: {
       chapters: {
         orderBy: [{ sort_order: "asc" }, { chapter_number: "asc" }, { created_at: "asc" }],
       },
       author: true,
       variants: true,
     },
  });
});

export const getNewArrivalBooks = publicProcedure.query(async () => {
  return await prisma.book.findMany({
    where: { deleted_at: null, published: true, status: { not: "archived" } },
    orderBy: { created_at: "desc" },
     include: {
       chapters: {
         orderBy: [{ sort_order: "asc" }, { chapter_number: "asc" }, { created_at: "asc" }],
       },
       author: true,
       variants: true,
     },
    take: 12,
  });
});

export const getPurchasedBooksByCustomer = publicProcedure
  .input(findBookByIdSchema)
  .query(async (opts) => {
    const settings = await getBookSettings();
    const customers = await prisma.customer.findMany({
      where: { user_id: opts.input.id },
      select: { id: true },
    });
 
    if (!customers.length) return [];

    const customerIds = customers.map((customer) => customer.id);
 
    const paidOrders = await prisma.order.findMany({
      where: {
        customer_id:    { in: customerIds },
        payment_status: "captured",
      },
      orderBy: { created_at: "desc" },
      include: {
        line_items: {
          include: {
            book_variant: {
              include: {
                book: {
                  include: {
                    author: true,
                    chapters: {
                      orderBy: [{ sort_order: "asc" }, { chapter_number: "asc" }, { created_at: "asc" }],
                    },
                    variants: true,
                    issue_reports: true,
                  },
                },
              },
            },
          },
        },
      },
    });
 
    const entries: any[] = [];
 
    paidOrders.forEach((order) => {
      // Parse delivery address from order.notes
      let deliveryAddress: any = null;
      let shippingZone: string | null = null;
      if (order.notes) {
        try {
          const parsed = JSON.parse(order.notes);
          if (parsed?.delivery_address) {
            deliveryAddress = parsed.delivery_address;
            shippingZone    = parsed.shipping_zone ?? null;
          }
        } catch {
          // plain string notes — no delivery data
        }
      }
 
      order.line_items.forEach((lineItem) => {
        const rawBook = lineItem.book_variant?.book;
        const book = rawBook ? decorateBookForResponse(rawBook, settings) : null;
        if (!book || book.deleted_at) return;
 
        const format:     string  = lineItem.book_variant.format;
        const isPhysical: boolean = format === "paperback" || format === "hardcover";
        const quantity:   number  = lineItem.quantity ?? 1;
 
        // Push one entry per unit so the reader sees the correct total count.
        // e.g. quantity=2 → two rows, each representing one owned copy.
        // _quantity is attached to every entry so the UI can display "Qty 2"
        // in a single row if the DataTable is later updated to group by lineItem.
        for (let unit = 0; unit < quantity; unit++) {
          entries.push({
            // Core book fields spread first
            ...book,
 
            // Purchase context — prefixed to avoid clashing with book fields
            _purchaseId:        `${lineItem.id}-${unit}`, // unique per row
            _lineItemId:        lineItem.id,
            _format:            format,
            _variantSize:       lineItem.book_variant.size ?? null,
            _isPhysical:        isPhysical,
            _fulfillmentStatus: lineItem.fulfillment_status,
            _quantity:          quantity,   // total qty on this line item
            _unitIndex:         unit + 1,   // which unit this row represents (1-based)
 
            // Delivery context (only meaningful for physical)
            _deliveryAddress:   isPhysical ? deliveryAddress : null,
            _shippingZone:      isPhysical ? shippingZone    : null,
            _shippingAmount:    isPhysical ? order.shipping_amount : null,
            _orderNumber:       order.order_number,
            _orderId:           order.id,
            _orderedAt:         order.created_at,
          });
        }
      });
    });
 
    return entries;
  });


export const generateWatermarkedEbook = publicProcedure
  .input(
    z.object({
      bookId: z.string(),
      // Removed orderId and variantId to match your frontend call
    })
  )
  .mutation(async ({ input, ctx }) => {
    // ctx.session is now available because of Step 1
    const session = ctx.session;

    if (!session?.user?.email) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You must be logged in to download.",
      });
    }

      const book = await prisma.book.findUnique({
        where: { id: input.bookId },
        include: {
          author: {
            include: {
              user: true,
            },
          },
          publisher: {
            include: {
              tenant: true,
            },
          },
        },
      });

    const pdfUrl = book?.ebook_pdf_url || book?.pdf_url;
    if (!book || !pdfUrl) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Book asset not found.",
      });
    }

    try {
      // 1. Download original from Vercel Blob
      const response = await axios.get(pdfUrl, {
        responseType: "arraybuffer",
      });

      // 2. Process with pdf-lib (Watermarking + Encryption)
      const securedPdf = await watermarkPdf(
        Buffer.from(response.data),
        session.user.email,
        resolveBookStoreContext(book)
      );

      // 3. Upload temporary secure copy
      const authorName =
        `${book.author?.user?.first_name ?? ""} ${book.author?.user?.last_name ?? ""}`.trim() ||
        "author";
      const displayFilename = `${[book.title, authorName].filter(Boolean).join(" - ").replace(/[\\/:*?"<>|]+/g, "").trim() || "Book Download"}.pdf`;
      const filenameBase = [book.title, authorName]
        .filter(Boolean)
        .map((part) => slugifyBookAssetName(part))
        .filter(Boolean)
        .join("-");
      const tempName = `temp/${filenameBase || "book-download"}-${Date.now()}.pdf`;
      const { url } = await put(tempName, Buffer.from(securedPdf), { 
        access: "public",
        contentType: "application/pdf",
      });

      return { url, filename: displayFilename };
    } catch (error) {
      console.error("Watermarking Error:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Watermarking failed. Please try again.",
      });
    }
  });


export const searchEverything = publicProcedure
  .input(z.object({ query: z.string().min(2) }))
  .query(async ({ input }) => {
    const { query } = input;

      const books = await prisma.book.findMany({
        where: {
          deleted_at: null,
          published: true, // Only show books that are actually live
          status: { not: "archived" },
          OR: [
          { title: { contains: query, mode: "insensitive" } },
          { 
            author: { 
              user: { 
                OR: [
                  { first_name: { contains: query, mode: "insensitive" } },
                  { last_name: { contains: query, mode: "insensitive" } }
                ]
              } 
            } 
          },
          { 
            categories: { 
              some: { 
                name: { contains: query, mode: "insensitive" } 
              } 
            } 
          }
        ],
      },
      include: {
        author: { 
          include: { 
            user: { select: { first_name: true, last_name: true } } 
          } 
        },
        categories: { select: { name: true, slug: true } }
      },
      take: 8,
    });

    return books;
  });

export const reportBookIssue = publicProcedure
  .input(reportBookIssueSchema)
  .mutation(async ({ input }) => {
    const session = await auth();
    const createdReport = await prisma.bookIssueReport.create({
      data: {
        book_id: input.book_id,
        reporter_user_id: session?.user?.id ?? null,
        reporter_name: input.reporter_name || session?.user?.first_name || null,
        reporter_email: input.reporter_email || session?.user?.email || null,
        issue_type: input.issue_type,
        description: input.description,
      },
    });

    const book = await prisma.book.findUnique({
      where: { id: input.book_id },
      select: { title: true },
    });
    const adminUsers = await prisma.adminUser.findMany({
      where: { status: "active" },
      select: { email: true },
    });

    adminUsers.forEach((adminUser) => {
      sendBookIssueReportEmail({
        to: adminUser.email,
        bookTitle: book?.title ?? "Unknown Book",
        issueType: input.issue_type,
        description: input.description,
        reporterName: input.reporter_name || session?.user?.first_name || null,
        reporterEmail: input.reporter_email || session?.user?.email || null,
      }).catch((err: any) => {
        console.error("[reportBookIssue] Failed to send issue report email:", err);
      });
    });

    return createdReport;
  });

export const getBookIssueReports = publicProcedure
  .input(findBookByIdSchema)
  .query(async ({ input }) => {
    const session = await auth();
    const roleNames = session?.roles?.map((role) => role.name.toLowerCase()) ?? [];
    const isAllowed = roleNames.some((role) => role === "super-admin" || role === "publisher" || role === "author");

    if (!session || !isAllowed) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "You do not have access to issue reports." });
    }

    return await prisma.bookIssueReport.findMany({
      where: { book_id: input.id },
      orderBy: { created_at: "desc" },
    });
  });

export const updateBookIssueReportStatus = publicProcedure
  .input(updateBookIssueReportStatusSchema)
  .mutation(async ({ input }) => {
    const session = await auth();
    const roleNames = session?.roles?.map((role) => role.name.toLowerCase()) ?? [];
    const isAllowed = roleNames.some((role) => role === "super-admin" || role.startsWith("staff-") || role === "tenant-admin");

    if (!session || !isAllowed) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Only staff can update report status." });
    }

    return await prisma.bookIssueReport.update({
      where: { id: input.id },
      data: {
        status: input.status,
        reviewer_notes: input.reviewer_notes ?? null,
      },
    });
  });
