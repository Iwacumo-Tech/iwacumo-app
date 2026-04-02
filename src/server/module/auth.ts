import { publicProcedure } from "@/server/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { hash, compare } from "bcryptjs";
import prisma from "@/lib/prisma";
import {
  createVerificationToken,
  validateVerificationToken,
  consumeVerificationToken,
  wasTokenRecentlySent,
} from "@/lib/tokens";
import { sendPasswordResetEmail, sendVerificationEmail } from "@/lib/email";
 
// ─── Forgot Password ─────────────────────────────────────────
// Generates a reset token and emails it.
// Always responds successfully to prevent email enumeration.
export const forgotPassword = publicProcedure
  .input(z.object({ email: z.string().email() }))
  .mutation(async ({ input }) => {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });
 
    // Silently succeed if user not found
    if (!user) return { ok: true };
 
    // Rate limit: 60-second cooldown
    const tooSoon = await wasTokenRecentlySent(user.id, "PASSWORD_RESET", 60);
    if (tooSoon) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: "Please wait before requesting another reset link.",
      });
    }
 
    const token = await createVerificationToken(user.id, "PASSWORD_RESET");
 
    await sendPasswordResetEmail({
      to: user.email,
      firstName: user.first_name,
      token,
    });
 
    return { ok: true };
  });
 
// ─── Reset Password ──────────────────────────────────────────
// Validates the reset token and sets the new password.
export const resetPassword = publicProcedure
  .input(
    z.object({
      token: z.string().min(1),
      password: z.string().min(8, "Password must be at least 8 characters"),
    })
  )
  .mutation(async ({ input }) => {
    let userId: string;
 
    try {
      userId = await validateVerificationToken(input.token, "PASSWORD_RESET");
    } catch (err: any) {
      const msg =
        err.message === "TOKEN_EXPIRED"
          ? "This reset link has expired. Please request a new one."
          : err.message === "TOKEN_USED"
          ? "This reset link has already been used."
          : "Invalid reset link.";
      throw new TRPCError({ code: "BAD_REQUEST", message: msg });
    }
 
    const hashedPassword = await hash(input.password, 12);
 
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
 
    await consumeVerificationToken(input.token);
 
    return { ok: true };
  });
 
// ─── Change Password (authenticated) ─────────────────────────
// Requires the current password to be confirmed first.
export const changePassword = publicProcedure
  .input(
    z.object({
      userId: z.string(),
      currentPassword: z.string().min(1),
      newPassword: z.string().min(8, "Password must be at least 8 characters"),
    })
  )
  .mutation(async ({ input }) => {
    const user = await prisma.user.findUnique({ where: { id: input.userId } });
 
    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
    }
 
    const passwordMatch = await compare(input.currentPassword, user.password);
    if (!passwordMatch) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Current password is incorrect.",
      });
    }
 
    if (input.currentPassword === input.newPassword) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "New password must differ from current password.",
      });
    }
 
    const hashedPassword = await hash(input.newPassword, 12);
 
    await prisma.user.update({
      where: { id: input.userId },
      data: { password: hashedPassword },
    });
 
    return { ok: true };
  });
 
// ─── Resend Verification Email ───────────────────────────────
export const resendVerificationEmail = publicProcedure
  .input(z.object({ email: z.string().email() }))
  .mutation(async ({ input }) => {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });
 
    // Silently succeed — don't reveal whether email exists
    if (!user || user.email_verified_at) return { ok: true };
 
    const tooSoon = await wasTokenRecentlySent(user.id, "EMAIL_VERIFY", 60);
    if (tooSoon) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: "Please wait 60 seconds before requesting another email.",
      });
    }
 
    const token = await createVerificationToken(user.id, "EMAIL_VERIFY");
 
    await sendVerificationEmail({
      to: user.email,
      firstName: user.first_name,
      token,
    });
 
    return { ok: true };
  });

export const getAuthorPricingContext = publicProcedure.query(async ({ ctx }) => {
  if (!ctx.session?.user?.id) return null;
 
  const userId = ctx.session.user.id;
 
  const user = await prisma.user.findUnique({
    where:   { id: userId },
    include: {
      author: {
        include: {
          publisher: {
            select: { id: true, white_label: true },
          },
          publisher_splits: {
            // The split configured for this author by their publisher
            take: 1,
            orderBy: { created_at: "desc" },
          },
        },
      },
    },
  });
 
  if (!user?.author) return null;
 
  const author         = user.author;
  const publisher      = author.publisher;
  const isWhiteLabel   = publisher?.white_label ?? false;
  const publisherSplit = author.publisher_splits[0]?.publisher_split_percent ?? 30;
 
  return {
    is_white_label:          isWhiteLabel,
    publisher_split_percent: publisherSplit,
    // author_split_percent = what the author actually keeps of the post-fee remainder
    author_split_percent:    100 - publisherSplit,
  };
});