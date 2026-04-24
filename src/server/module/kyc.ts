import { z } from "zod";
import { publicProcedure } from "@/server/trpc";
import { TRPCError } from "@trpc/server";
import prisma from "@/lib/prisma";
import { sendAuthorKycApprovedEmail, sendAuthorKycRejectedEmail, sendKycApprovedEmail, sendKycRejectedEmail } from "@/lib/email";
import { auth } from "@/auth";

const DEFAULT_KYC_REQUIREMENTS = {
  require_id: true,
  require_business_reg: true,
  require_proof_of_address: true,
};

type KycRequirements = typeof DEFAULT_KYC_REQUIREMENTS;

function isFilled(value?: string | null) {
  return !!value?.trim();
}

function getMissingRequirements(
  record: {
    id_document_url?: string | null;
    business_reg_url?: string | null;
    proof_of_address_url?: string | null;
  } | null | undefined,
  requirements: KycRequirements
) {
  const missing: string[] = [];

  if (requirements.require_id && !isFilled(record?.id_document_url)) {
    missing.push("government_id");
  }

  if (requirements.require_business_reg && !isFilled(record?.business_reg_url)) {
    missing.push("business_registration");
  }

  if (requirements.require_proof_of_address && !isFilled(record?.proof_of_address_url)) {
    missing.push("proof_of_address");
  }

  return missing;
}

function withComplianceState<T extends {
  status: string;
  id_document_url?: string | null;
  business_reg_url?: string | null;
  proof_of_address_url?: string | null;
}>(record: T, requirements: KycRequirements) {
  const missing_requirements = getMissingRequirements(record, requirements);
  const requirements_currently_met = missing_requirements.length === 0;
  const needs_resubmission = record.status === "approved" && !requirements_currently_met;

  return {
    ...record,
    requirements_currently_met,
    missing_requirements,
    needs_resubmission,
  };
}

async function getPublisherRequirements() {
  const setting = await prisma.systemSettings.findUnique({
    where: { key: "kyc_requirements" },
  });

  if (!setting) return DEFAULT_KYC_REQUIREMENTS;

  const val = setting.value as any;
  return {
    require_id: val.require_id ?? true,
    require_business_reg: val.require_business_reg ?? true,
    require_proof_of_address: val.require_proof_of_address ?? true,
  };
}

async function getAuthorRequirements() {
  const setting = await prisma.systemSettings.findUnique({
    where: { key: "author_kyc_requirements" },
  });

  if (!setting) return DEFAULT_KYC_REQUIREMENTS;

  const val = setting.value as any;
  return {
    require_id: val.require_id ?? true,
    require_business_reg: val.require_business_reg ?? true,
    require_proof_of_address: val.require_proof_of_address ?? true,
  };
}

function validateSubmissionAgainstRequirements(
  data: {
    id_document_url: string;
    business_reg_url: string;
    proof_of_address_url: string;
  },
  requirements: KycRequirements
) {
  if (requirements.require_id && !isFilled(data.id_document_url)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Please upload your ID document." });
  }

  if (requirements.require_business_reg && !isFilled(data.business_reg_url)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Please upload your business registration document." });
  }

  if (requirements.require_proof_of_address && !isFilled(data.proof_of_address_url)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Please upload your proof of address." });
  }
}

// ── submitKyc ─────────────────────────────────────────────────
// Called by the publisher from /app/kyc.
// Creates or updates their KYC record and sets status → submitted.
export const submitKyc = publicProcedure
  .input(
    z.object({
      publisher_id: z.string(),

      // Identity - Allow empty strings if not required by business logic
      // We use .min(0) or just z.string() to avoid the strict URL format check
      id_document_url:  z.string(), 
      id_document_type: z.enum(["passport", "national_id", "drivers_license"]),
      legal_name:       z.string(),
      phone_number:     z.string(),

      // Business registration
      business_reg_url: z.string(),
      business_name:    z.string(),
      business_address: z.string(),

      // Proof of address
      proof_of_address_url: z.string(), 
    })
  )
  .mutation(async ({ input }) => {
    const { publisher_id, ...data } = input;

    // 1. Verify publisher exists
    const publisher = await prisma.publisher.findUnique({
      where: { id: publisher_id },
    });

    if (!publisher) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Publisher not found." });
    }

    const requirements = await getPublisherRequirements();
    validateSubmissionAgainstRequirements(data, requirements);

    // 3. Block resubmission if already approved
    const existing = await prisma.kycVerification.findUnique({
      where: { publisher_id },
    });

    const approvedStillValid =
      existing?.status === "approved" &&
      getMissingRequirements(existing, requirements).length === 0;

    if (approvedStillValid) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Your KYC is already approved.",
      });
    }

    // 4. Create or update
    return await prisma.kycVerification.upsert({
      where:  { publisher_id },
      update: { 
        ...data, 
        status: "submitted", 
        submitted_at: new Date(), 
        reviewed_at: null, 
        reviewer_id: null, 
        reviewer_notes: null 
      },
      create: { 
        publisher_id, 
        ...data, 
        status: "submitted", 
        submitted_at: new Date() 
      },
    });
  });
// ── getMyKyc ──────────────────────────────────────────────────
// Publisher fetches their own KYC record.
export const getMyKyc = publicProcedure
  .input(z.object({ publisher_id: z.string() }))
  .query(async ({ input }) => {
    const [record, requirements] = await Promise.all([
      prisma.kycVerification.findUnique({
        where: { publisher_id: input.publisher_id },
      }),
      getPublisherRequirements(),
    ]);

    if (!record) return null;

    return withComplianceState(record, requirements);
  });

// ── getAllKycSubmissions ───────────────────────────────────────
// Admin fetches all KYC records with publisher + user info.
export const getAllKycSubmissions = publicProcedure.query(async () => {
  const [records, requirements] = await Promise.all([
    prisma.kycVerification.findMany({
      orderBy: { submitted_at: "desc" },
      include: {
        publisher: {
          include: {
            user:   { select: { first_name: true, last_name: true, email: true } },
            tenant: { select: { name: true, slug: true } },
          },
        },
        reviewer: { select: { first_name: true, last_name: true, email: true } },
      },
    }),
    getPublisherRequirements(),
  ]);

  return records.map((record) => withComplianceState(record, requirements));
});

// ── reviewKyc ─────────────────────────────────────────────────
// Admin approves or rejects a KYC submission.
export const reviewKyc = publicProcedure
  .input(
    z.object({
      kyc_id:         z.string(),
      reviewer_id:    z.string().optional(), // admin's session user id
      decision:       z.enum(["approved", "rejected"]),
      reviewer_notes: z.string().optional(),
    })
  )
  .mutation(async ({ input }) => {
    const session = await auth();
    const reviewerId = input.reviewer_id ?? session?.user?.id;
    if (!reviewerId) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Could not identify the reviewing staff account." });
    }

    const kyc = await prisma.kycVerification.findUnique({
      where:   { id: input.kyc_id },
      include: {
        publisher: {
          include: {
            user:   { select: { email: true, first_name: true } },
            tenant: { select: { name: true } },
          },
        },
      },
    });

    if (!kyc) {
      throw new TRPCError({ code: "NOT_FOUND", message: "KYC record not found." });
    }

    if (kyc.status !== "submitted") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Cannot review a KYC with status "${kyc.status}".`,
      });
    }

    // Resolve reviewer — try AdminUser first, fall back to regular User
    const adminReviewer = await prisma.adminUser.findUnique({
      where: { id: reviewerId },
    });

    const reviewerName = adminReviewer
      ? `${adminReviewer.first_name ?? ""} ${adminReviewer.last_name ?? ""}`.trim() || "Admin"
      : "Admin";

    // Update the KYC record
    const updated = await prisma.kycVerification.update({
      where: { id: input.kyc_id },
      data:  {
        status:         input.decision,
        reviewer_id:    adminReviewer ? reviewerId : null,
        reviewer_notes: input.reviewer_notes ?? null,
        reviewed_at:    new Date(),
      },
    });

    // Send email notification to publisher
    const publisherEmail     = kyc.publisher.user.email;
    const publisherFirstName = kyc.publisher.user.first_name;
    const orgName            = kyc.publisher.tenant?.name ?? "your organization";

    try {
      if (input.decision === "approved") {
        await sendKycApprovedEmail({
          to:        publisherEmail,
          firstName: publisherFirstName,
          orgName,
        });
      } else {
        await sendKycRejectedEmail({
          to:            publisherEmail,
          firstName:     publisherFirstName,
          orgName,
          reviewerNotes: input.reviewer_notes ?? null,
        });
      }
    } catch (emailErr) {
      // Non-fatal — log but don't fail the review
      console.error("[kyc] Failed to send review email:", emailErr);
    }

    return updated;
  });

// ── getKycRequirements ────────────────────────────────────────
// Reads which documents are currently required from SystemSettings.
export const getKycRequirements = publicProcedure.query(async () => {
  return getPublisherRequirements();
});

// ── updateKycRequirements ─────────────────────────────────────
// Admin updates which documents are required. Saved to SystemSettings.
export const updateKycRequirements = publicProcedure
  .input(
    z.object({
      require_id:               z.boolean(),
      require_business_reg:     z.boolean(),
      require_proof_of_address: z.boolean(),
    })
  )
  .mutation(async ({ input }) => {
    return await prisma.systemSettings.upsert({
      where:  { key: "kyc_requirements" },
      update: { value: input },
      create: { key: "kyc_requirements", value: input },
    });
  });

export const submitAuthorKyc = publicProcedure
  .input(
    z.object({
      author_id: z.string(),
      id_document_url: z.string(),
      id_document_type: z.enum(["passport", "national_id", "drivers_license"]),
      legal_name: z.string(),
      phone_number: z.string(),
      business_reg_url: z.string(),
      business_name: z.string(),
      business_address: z.string(),
      proof_of_address_url: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    const { author_id, ...data } = input;
    const author = await prisma.author.findUnique({
      where: { id: author_id },
      include: { publisher: true },
    });

    if (!author) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Author not found." });
    }

    if (!author.publisher?.white_label) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Author verification is only required for white-label publishers." });
    }

    const requirements = await getAuthorRequirements();
    validateSubmissionAgainstRequirements(data, requirements);

    const existing = await prisma.authorKycVerification.findUnique({
      where: { author_id },
    });

    const approvedStillValid =
      existing?.status === "approved" &&
      getMissingRequirements(existing, requirements).length === 0;

    if (approvedStillValid) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Your author verification is already approved." });
    }

    return await prisma.authorKycVerification.upsert({
      where: { author_id },
      update: {
        ...data,
        status: "submitted",
        submitted_at: new Date(),
        reviewed_at: null,
        reviewer_id: null,
        reviewer_notes: null,
      },
      create: {
        author_id,
        ...data,
        status: "submitted",
        submitted_at: new Date(),
      },
    });
  });

export const getMyAuthorKyc = publicProcedure
  .input(z.object({ author_id: z.string() }))
  .query(async ({ input }) => {
    const [record, requirements] = await Promise.all([
      prisma.authorKycVerification.findUnique({
        where: { author_id: input.author_id },
      }),
      getAuthorRequirements(),
    ]);

    if (!record) return null;

    return withComplianceState(record, requirements);
  });

export const getAllAuthorKycSubmissions = publicProcedure.query(async () => {
  const [records, requirements] = await Promise.all([
    prisma.authorKycVerification.findMany({
      orderBy: { submitted_at: "desc" },
      include: {
        author: {
          include: {
            user: { select: { first_name: true, last_name: true, email: true } },
            publisher: {
              include: {
                tenant: { select: { name: true, slug: true } },
              },
            },
          },
        },
        reviewer: { select: { first_name: true, last_name: true, email: true } },
      },
    }),
    getAuthorRequirements(),
  ]);

  return records.map((record) => withComplianceState(record, requirements));
});

export const reviewAuthorKyc = publicProcedure
  .input(
    z.object({
      kyc_id: z.string(),
      reviewer_id: z.string().optional(),
      decision: z.enum(["approved", "rejected"]),
      reviewer_notes: z.string().optional(),
    })
  )
  .mutation(async ({ input }) => {
    const session = await auth();
    const reviewerId = input.reviewer_id ?? session?.user?.id;
    if (!reviewerId) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Could not identify the reviewing staff account." });
    }

    const kyc = await prisma.authorKycVerification.findUnique({
      where: { id: input.kyc_id },
      include: {
        author: {
          include: {
            user: { select: { email: true, first_name: true } },
            publisher: { include: { tenant: { select: { name: true } } } },
          },
        },
      },
    });

    if (!kyc) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Author verification record not found." });
    }

    if (kyc.status !== "submitted") {
      throw new TRPCError({ code: "BAD_REQUEST", message: `Cannot review a KYC with status "${kyc.status}".` });
    }

    const adminReviewer = await prisma.adminUser.findUnique({
      where: { id: reviewerId },
    });

    const updated = await prisma.authorKycVerification.update({
      where: { id: input.kyc_id },
      data: {
        status: input.decision,
        reviewer_id: adminReviewer ? reviewerId : null,
        reviewer_notes: input.reviewer_notes ?? null,
        reviewed_at: new Date(),
      },
    });

    try {
      if (input.decision === "approved") {
        await sendAuthorKycApprovedEmail({
          to: kyc.author.user.email,
          firstName: kyc.author.user.first_name,
          publisherName: kyc.author.publisher?.tenant?.name ?? "your publisher",
        });
      } else {
        await sendAuthorKycRejectedEmail({
          to: kyc.author.user.email,
          firstName: kyc.author.user.first_name,
          publisherName: kyc.author.publisher?.tenant?.name ?? "your publisher",
          reviewerNotes: input.reviewer_notes ?? null,
        });
      }
    } catch (emailErr) {
      console.error("[author-kyc] Failed to send review email:", emailErr);
    }

    return updated;
  });

export const getAuthorKycRequirements = publicProcedure.query(async () => {
  return getAuthorRequirements();
});

export const updateAuthorKycRequirements = publicProcedure
  .input(
    z.object({
      require_id: z.boolean(),
      require_business_reg: z.boolean(),
      require_proof_of_address: z.boolean(),
    })
  )
  .mutation(async ({ input }) => {
    return await prisma.systemSettings.upsert({
      where: { key: "author_kyc_requirements" },
      update: { value: input },
      create: { key: "author_kyc_requirements", value: input },
    });
  });
