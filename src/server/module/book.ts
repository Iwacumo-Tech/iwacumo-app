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

async function extractChaptersFromDocx(docxUrl?: string | null) {
  if (!docxUrl) return [];

  try {
    const response = await axios.get(docxUrl, { responseType: "arraybuffer" });
    const result = await mammoth.convertToHtml({ buffer: Buffer.from(response.data) });
    const fullHtml = result.value;
    const sections = fullHtml.split(/(?=<h[1-2][^>]*>)/i).filter(Boolean);

    if (sections.length > 0) {
      return sections.map((section, index) => {
        const titleMatch = section.match(/<h[1-2][^>]*>(.*?)<\/h[1-2]>/i);
        const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim() : `Chapter ${index + 1}`;

        return {
          title,
          content: section,
          chapter_number: index + 1,
          word_count: section.replace(/<[^>]+>/g, "").split(/\s+/).length,
        };
      });
    }

    return [{
      title: "Full Content",
      content: fullHtml,
      chapter_number: 1,
      word_count: fullHtml.replace(/<[^>]+>/g, "").split(/\s+/).length,
    }];
  } catch (error) {
    console.error("Failed to parse DOCX for chapter extraction:", error);
    return [];
  }
}

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
  const autoChapters = await extractChaptersFromDocx(docxSourceUrl);

  const tagArray = opts.input.tags
    ? opts.input.tags.split("*").map(tag => tag.trim())
    : opts.input.subject_tags || [];
  const metadata = {
    custom_fields: opts.input.custom_fields ?? {},
    private_creator_notes: opts.input.admin_private_notes ?? null,
  };

  // --- DATABASE TRANSACTION ---
  return await prisma.$transaction(async (tx) => {
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

    if (autoChapters.length > 0) {
      await tx.chapter.createMany({
        data: autoChapters.map(ch => ({
          ...ch,
          book_id: createdBook.id,
        })),
      });
    }

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
    select: { metadata: true, _count: { select: { chapters: true } } },
  });
  const docxSourceUrl = opts.input.text_url ?? opts.input.docx_url ?? null;
  const autoChapters =
    docxSourceUrl && (existingBook?._count?.chapters ?? 0) === 0
      ? await extractChaptersFromDocx(docxSourceUrl)
      : [];
  const metadata = {
    ...((existingBook?.metadata as Record<string, any> | null) ?? {}),
    custom_fields: opts.input.custom_fields ?? getCustomFieldValueMap(existingBook?.metadata),
    private_creator_notes:
      opts.input.admin_private_notes ??
      ((existingBook?.metadata as Record<string, any> | null)?.private_creator_notes ?? null),
  };

  return await prisma.$transaction(async (tx) => {
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

    if (autoChapters.length > 0) {
      await tx.chapter.createMany({
        data: autoChapters.map((chapter) => ({
          ...chapter,
          book_id: updatedBook.id,
        })),
      });
    }

    return updatedBook;
  });
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
      chapters: true,
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
        chapters: true,
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
    chapters: true, 
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
    include: { chapters: true, author: true, variants: true },
  });
});

export const getNewArrivalBooks = publicProcedure.query(async () => {
  return await prisma.book.findMany({
    where: { deleted_at: null, published: true, status: { not: "archived" } },
    orderBy: { created_at: "desc" },
    include: { chapters: true, author: true, variants: true },
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
                  include: { author: true, chapters: true, variants: true, issue_reports: true },
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

    if (!book || !book.pdf_url) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Book asset not found.",
      });
    }

    try {
      // 1. Download original from Vercel Blob
      const response = await axios.get(book.pdf_url, {
        responseType: "arraybuffer",
      });

      // 2. Process with pdf-lib (Watermarking)
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
