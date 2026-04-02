
import prisma from "@/lib/prisma";
 
export async function checkIsSuperAdmin(userId: string): Promise<boolean> {
  // ── Type A: regular User — check claims table ─────────────────────────────
 
  // Pattern A1: direct role claim
  const roleClaim = await prisma.claim.findFirst({
    where: { user_id: userId, role_name: "super-admin", active: true },
  });
  if (roleClaim) return true;
 
  // Pattern A2: permission-linked claim (most common for seeded super-admins)
  const permClaim = await prisma.claim.findFirst({
    where: {
      user_id:    userId,
      active:     true,
      permission: { name: "super-admin", active: true },
    },
  });
  if (permClaim) return true;
 
  // ── Type B: AdminUser — check admin_user_roles table ─────────────────────
  const adminRole = await prisma.adminUserRole.findFirst({
    where: {
      admin_user_id: userId,
      role_name:     "super-admin",
    },
  });
  if (adminRole) return true;
 
  return false;
}
 
// ─── resolveUserContext ───────────────────────────────────────────────────────
// Returns the publisher and author IDs for a session user, regardless of
// whether they are a User or an AdminUser. Centralises the dual-table lookup
// so procedures don't each need to handle it independently.
 
export async function resolveUserContext(userId: string): Promise<{
  isUser:       boolean;
  isAdminUser:  boolean;
  publisher_id: string | null;
  author_id:    string | null;
  isSuperAdmin: boolean;
}> {
  const [userRecord, adminRecord, superAdmin] = await Promise.all([
    prisma.user.findUnique({
      where:   { id: userId },
      include: { publisher: true, author: true },
    }),
    prisma.adminUser.findUnique({
      where:   { id: userId },
      include: {
        roles: { include: { role: true } },
        tenant: { include: { publishers: true } },
      },
    }),
    checkIsSuperAdmin(userId),
  ]);
 
  if (userRecord) {
    return {
      isUser:       true,
      isAdminUser:  false,
      publisher_id: userRecord.publisher?.id ?? null,
      author_id:    userRecord.author?.id    ?? null,
      isSuperAdmin: superAdmin,
    };
  }
 
  if (adminRecord) {
    // AdminUser publisher_id comes from their role assignment or tenant
    const publisherId =
      adminRecord.roles.find(r => r.publisher_id)?.publisher_id ??
      adminRecord.tenant?.publishers?.id ??
      null;
 
    return {
      isUser:       false,
      isAdminUser:  true,
      publisher_id: publisherId,
      author_id:    null, // AdminUsers are never authors
      isSuperAdmin: superAdmin,
    };
  }
 
  // ID not found in either table — treat as unauthenticated
  return {
    isUser:       false,
    isAdminUser:  false,
    publisher_id: null,
    author_id:    null,
    isSuperAdmin: false,
  };
}