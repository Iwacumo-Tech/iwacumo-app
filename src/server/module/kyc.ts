import { z } from "zod";
import { publicProcedure } from "@/server/trpc";
import { TRPCError } from "@trpc/server";
import prisma from "@/lib/prisma";
import { sendKycApprovedEmail, sendKycRejectedEmail } from "@/lib/email";

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

    // 2. [OPTIONAL] Server-side Validation Logic
    // If you want to be extra safe, fetch the requirements here and 
    // throw an error if a REQUIRED field is empty.
    /*
    const settings = await prisma.systemSettings.findUnique({ where: { key: "kyc_requirements" } });
    const reqs = settings?.value as any;
    if (reqs?.require_proof_of_address && !data.proof_of_address_url) {
       throw new TRPCError({ code: "BAD_REQUEST", message: "Proof of address is required." });
    }
    */

    // 3. Block resubmission if already approved
    const existing = await prisma.kycVerification.findUnique({
      where: { publisher_id },
    });

    if (existing?.status === "approved") {
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
    return await prisma.kycVerification.findUnique({
      where: { publisher_id: input.publisher_id },
    });
  });

// ── getAllKycSubmissions ───────────────────────────────────────
// Admin fetches all KYC records with publisher + user info.
export const getAllKycSubmissions = publicProcedure.query(async () => {
  return await prisma.kycVerification.findMany({
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
  });
});

// ── reviewKyc ─────────────────────────────────────────────────
// Admin approves or rejects a KYC submission.
export const reviewKyc = publicProcedure
  .input(
    z.object({
      kyc_id:         z.string(),
      reviewer_id:    z.string(), // admin's session user id
      decision:       z.enum(["approved", "rejected"]),
      reviewer_notes: z.string().optional(),
    })
  )
  .mutation(async ({ input }) => {
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
      where: { id: input.reviewer_id },
    });

    const reviewerName = adminReviewer
      ? `${adminReviewer.first_name ?? ""} ${adminReviewer.last_name ?? ""}`.trim() || "Admin"
      : "Admin";

    // Update the KYC record
    const updated = await prisma.kycVerification.update({
      where: { id: input.kyc_id },
      data:  {
        status:         input.decision,
        reviewer_id:    adminReviewer ? input.reviewer_id : null,
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
  const setting = await prisma.systemSettings.findUnique({
    where: { key: "kyc_requirements" },
  });

  // Defaults: all three required
  const defaults = {
    require_id:               true,
    require_business_reg:     true,
    require_proof_of_address: true,
  };

  if (!setting) return defaults;

  const val = setting.value as any;
  return {
    require_id:               val.require_id               ?? true,
    require_business_reg:     val.require_business_reg     ?? true,
    require_proof_of_address: val.require_proof_of_address ?? true,
  };
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