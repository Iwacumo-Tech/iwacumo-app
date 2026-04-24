import crypto from "crypto";
import prisma from "@/lib/prisma";
 
export type TokenType = "EMAIL_VERIFY" | "PASSWORD_RESET" | "STAFF_INVITE" | "AUTHOR_INVITE";
 
const EXPIRY: Record<TokenType, number> = {
  EMAIL_VERIFY:   24 * 60 * 60 * 1000,      // 24 hours
  PASSWORD_RESET:  1 * 60 * 60 * 1000,      // 1 hour
  STAFF_INVITE:    7 * 24 * 60 * 60 * 1000, // 7 days
  AUTHOR_INVITE:   7 * 24 * 60 * 60 * 1000, // 7 days
};
 
// ── Create token for a regular User ──────────────────────────
export async function createVerificationToken(
  userId: string,
  type: TokenType
): Promise<string> {
  await prisma.verificationToken.deleteMany({
    where: { user_id: userId, type, used_at: null },
  });
 
  const token      = crypto.randomBytes(32).toString("hex");
  const expires_at = new Date(Date.now() + EXPIRY[type]);
 
  await prisma.verificationToken.create({
    data: { token, user_id: userId, admin_user_id: null, type, expires_at },
  });
 
  return token;
}
 
// ── Create token for an AdminUser ─────────────────────────────
export async function createAdminVerificationToken(
  adminUserId: string,
  type: TokenType
): Promise<string> {
  await prisma.verificationToken.deleteMany({
    where: { admin_user_id: adminUserId, type, used_at: null },
  });
 
  const token      = crypto.randomBytes(32).toString("hex");
  const expires_at = new Date(Date.now() + EXPIRY[type]);
 
  await prisma.verificationToken.create({
    data: { token, admin_user_id: adminUserId, user_id: null, type, expires_at },
  });
 
  return token;
}
 
// ── Validate any token — returns the owner's ID ───────────────
export async function validateVerificationToken(
  token: string,
  type: TokenType
): Promise<string> {
  const record = await prisma.verificationToken.findUnique({
    where: { token },
  });
 
  if (!record)              throw new Error("TOKEN_INVALID");
  if (record.type !== type) throw new Error("TOKEN_INVALID");
  if (record.used_at)       throw new Error("TOKEN_USED");
  if (record.expires_at < new Date()) throw new Error("TOKEN_EXPIRED");
 
  const ownerId = record.user_id ?? record.admin_user_id;
  if (!ownerId) throw new Error("TOKEN_INVALID");
 
  return ownerId;
}
 
// ── Consume a token (single-use) ─────────────────────────────
export async function consumeVerificationToken(token: string): Promise<void> {
  await prisma.verificationToken.update({
    where: { token },
    data: { used_at: new Date() },
  });
}
 
// ── Rate-limit guard for User tokens ─────────────────────────
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
 
// ── Rate-limit guard for AdminUser tokens ────────────────────
export async function wasAdminTokenRecentlySent(
  adminUserId: string,
  type: TokenType,
  cooldownSeconds = 60
): Promise<boolean> {
  const recent = await prisma.verificationToken.findFirst({
    where: {
      admin_user_id: adminUserId,
      type,
      used_at: null,
      created_at: { gte: new Date(Date.now() - cooldownSeconds * 1000) },
    },
  });
  return !!recent;
}
