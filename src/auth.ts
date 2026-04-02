import CredentialsProvider from "next-auth/providers/credentials";
import NextAuth from "next-auth";
import { compare } from "bcryptjs";
import { Permission, Role } from "@prisma/client";
import prisma from "@/lib/prisma";

export const { handlers, auth } = NextAuth({
  trustHost: true,
  providers: [
    CredentialsProvider({
      id: "credentials",
      credentials: {
        username: { label: "Username", type: "text", placeholder: "jsmith" },
        password: { label: "Password", type: "password" },
      },
      async authorize({ username, password }) {
        try {
          if (!password) return null;

          // ── 1. Check standard User table ──────────────────────────────────
          const user = await prisma.user.findFirst({
            where: {
              OR: [
                { email: username as string },
                { username: username as string },
              ],
            },
            include: {
              customers: true,
              claims: { where: { type: "ROLE", active: true } },
              // Include author with publisher so we can check white_label
              author: {
                include: {
                  publisher: { select: { white_label: true } },
                },
              },
            },
          });

          if (user && user.active) {
            if (await compare(password as string, user.password)) {

              // ── Email verification gate ──────────────────────────────────
              if (!user.email_verified_at) {
                const roleName = user.claims[0]?.role_name?.toLowerCase() ?? "";
                const isProtectedRole = roleName === "publisher" || roleName === "author";
                if (isProtectedRole) {
                  throw new Error("EMAIL_NOT_VERIFIED");
                }
              }

              // ── White-label author gate ──────────────────────────────────
              // Authors under non-white-label publishers are "credited authors"
              // only — they exist for attribution and split purposes but cannot
              // log in and manage their own dashboard.
              if (user.author && user.author.publisher_id) {
                const isWhiteLabel = user.author.publisher?.white_label ?? false;
                if (!isWhiteLabel) {
                  throw new Error("AUTHOR_NOT_PERMITTED");
                }
              }

              return {
                id:         user.id,
                email:      user.email,
                first_name: user.first_name,
                last_name:  user.last_name || "",
              };
            }
          }

          // ── 2. Check AdminUser table ───────────────────────────────────────
          const adminUser = await prisma.adminUser.findFirst({
            where: { email: username as string },
          });

          if (
            adminUser &&
            adminUser.status === "active" &&
            adminUser.password_hash
          ) {
            if (await compare(password as string, adminUser.password_hash)) {
              if (!adminUser.email_verified_at) {
                throw new Error("EMAIL_NOT_VERIFIED");
              }
              return {
                id:         adminUser.id,
                email:      adminUser.email,
                first_name: adminUser.first_name || "",
                last_name:  adminUser.last_name  || "",
              };
            }
          }

          return null;
        } catch (error: any) {
          if (
            error.message === "EMAIL_NOT_VERIFIED" ||
            error.message === "AUTHOR_NOT_PERMITTED"
          ) {
            throw error;
          }
          console.error("Auth Error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub        = user.id;
        token.name       = (user as any).first_name;
        token.email      = user.email;
        token.last_name  = (user as any).last_name || "";
      }
      return token;
    },
    async session({ session, token }) {
      if (!token.sub) return session;

      const claims = await getUserClaims(token.sub);

      const [userProfile, adminProfile] = await Promise.all([
        prisma.user.findUnique({
          where:   { id: token.sub },
          include: { author: true, publisher: true, customers: true },
        }),
        prisma.adminUser.findUnique({
          where:   { id: token.sub },
          include: {
            roles:  true,
            tenant: { include: { publishers: true } },
          },
        }),
      ]);

      const author_id    = userProfile?.author?.id    || null;
      let publisher_id   = userProfile?.publisher?.id || null;

      if (adminProfile) {
        publisher_id = publisher_id
          || adminProfile.roles.find(r => r.publisher_id)?.publisher_id
          || adminProfile.tenant?.publishers?.id
          || null;
      }

      const finalizedRoles = [...claims.roles];

      const hasCustomerProfiles = (userProfile?.customers?.length || 0) > 0;
      if (hasCustomerProfiles && !finalizedRoles.some(r => r.name.toLowerCase() === "customer")) {
        const customerRole = await prisma.role.findUnique({ where: { name: "customer" } });
        if (customerRole) {
          finalizedRoles.push(customerRole);
        } else {
          finalizedRoles.push({ name: "customer", active: true, built_in: true } as Role);
        }
      }

      if (author_id && !finalizedRoles.some(r => r.name.toLowerCase() === "author")) {
        finalizedRoles.push({ name: "author", active: true, built_in: true } as Role);
      }

      return {
        ...session,
        user: {
          id:         token.sub,
          first_name: (token.name as string)      || "",
          last_name:  (token.last_name as string)  || "",
          email:      (token.email as string)      || "",
          author_id,
          publisher_id,
          isCustomer: hasCustomerProfiles,
        },
        ...claims,
        roles: finalizedRoles,
      };
    },
  },
});

async function getUserClaims(userId: string): Promise<{
  permissions: Permission[];
  roles:       Role[];
  tenantSlug:  string | null;
}> {
  const permissionsMap = new Map<string, Permission>();
  const rolesMap       = new Map<string, Role>();
  let tenantSlug: string | null = null;

  const claims = await prisma.claim.findMany({
    where:   { user_id: userId, active: true },
    include: { permission: true, role: true },
  });

  for (const claim of claims) {
    if (claim.tenant_slug && !tenantSlug) tenantSlug = claim.tenant_slug;

    if (claim.role?.active) {
      rolesMap.set(claim.role.name, claim.role);
    }

    if (claim.permission?.active) {
      permissionsMap.set(claim.permission.id, claim.permission);

      const coreRoles = ["super-admin", "publisher", "author", "customer"];
      if (coreRoles.includes(claim.permission.name) && !rolesMap.has(claim.permission.name)) {
        const roleObj = await prisma.role.findUnique({ where: { name: claim.permission.name } });
        if (roleObj) rolesMap.set(roleObj.name, roleObj);
      }
    }
  }

  const adminUser = await prisma.adminUser.findUnique({
    where:   { id: userId },
    include: {
      tenant: true,
      roles: {
        include: {
          role: {
            include: {
              permissions: {
                where:   { active: true },
                include: { permission: true },
              },
            },
          },
        },
      },
    },
  });

  if (adminUser) {
    if (adminUser.tenant?.slug) tenantSlug = adminUser.tenant.slug;
    adminUser.roles.forEach((adminRole) => {
      if (adminRole.role.active) {
        rolesMap.set(adminRole.role.name, adminRole.role);
        adminRole.role.permissions.forEach((rp) => {
          if (rp.permission.active) permissionsMap.set(rp.permission.id, rp.permission);
        });
      }
    });
  }

  const roleNames = Array.from(rolesMap.keys());
  if (roleNames.length > 0) {
    const rolePermissions = await prisma.permissionRole.findMany({
      where: {
        active:        true,
        role_name:     { in: roleNames },
        permission_id: { notIn: Array.from(permissionsMap.keys()) },
      },
      include: { permission: true },
    });
    rolePermissions.forEach(({ permission }) => permissionsMap.set(permission.id, permission));
  }

  return {
    permissions: Array.from(permissionsMap.values()),
    roles:       Array.from(rolesMap.values()),
    tenantSlug,
  };
}