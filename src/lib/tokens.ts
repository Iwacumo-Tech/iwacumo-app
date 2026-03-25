import crypto from "crypto";
import prisma from "@/lib/prisma";

export type TokenType = "EMAIL_VERIFY" | "PASSWORD_RESET";

const EXPIRY: Record<TokenType, number> = {
  EMAIL_VERIFY: 24 * 60 * 60 * 1000,  // 24 hours
  PASSWORD_RESET: 60 * 60 * 1000,      // 1 hour
};

// ─── Generate + persist a token ──────────────────────────────
export async function createVerificationToken(
  userId: string,
  type: TokenType
): Promise<string> {
  // Invalidate any existing unused tokens of the same type for this user
  await prisma.verificationToken.deleteMany({
    where: { user_id: userId, type, used_at: null },
  });

  const token = crypto.randomBytes(32).toString("hex");
  const expires_at = new Date(Date.now() + EXPIRY[type]);

  await prisma.verificationToken.create({
    data: { token, user_id: userId, type, expires_at },
  });

  return token;
}

// ─── Validate a token (returns userId or throws) ─────────────
export async function validateVerificationToken(
  token: string,
  type: TokenType
): Promise<string> {
  const record = await prisma.verificationToken.findUnique({
    where: { token },
  });

  if (!record) throw new Error("TOKEN_INVALID");
  if (record.type !== type) throw new Error("TOKEN_INVALID");
  if (record.used_at) throw new Error("TOKEN_USED");
  if (record.expires_at < new Date()) throw new Error("TOKEN_EXPIRED");

  return record.user_id;
}

// ─── Mark a token as used ────────────────────────────────────
export async function consumeVerificationToken(token: string): Promise<void> {
  await prisma.verificationToken.update({
    where: { token },
    data: { used_at: new Date() },
  });
}

// ─── Rate-limit guard: was a token sent in last N seconds? ───
export async function wasTokenRecentlySent(
  userId: string,
  type: TokenType,
  cooldownSeconds = 60
): Promise<boolean> {
  const recent = await prisma.verificationToken.findFirst({
    where: {
      user_id: userId,
      type,
      used_at: null,
      created_at: { gte: new Date(Date.now() - cooldownSeconds * 1000) },
    },
  });
  return !!recent;
}