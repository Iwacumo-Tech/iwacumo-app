import CredentialsProvider from "next-auth/providers/credentials";
import NextAuth from "next-auth";
import { compare } from "bcryptjs";
import { Permission, Role } from "@prisma/client";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import {
  ACTIVE_PROFILE_COOKIE,
  DashboardProfile,
  resolveActiveProfile,
} from "@/lib/profile-mode";
import { checkIsSuperAdmin } from "@/lib/is-super-admin";

const SEVEN_DAYS_IN_SECONDS = 7 * 24 * 60 * 60;

export const { handlers, auth } = NextAuth({
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: SEVEN_DAYS_IN_SECONDS,
    updateAge: 24 * 60 * 60,
  },
  jwt: {
    maxAge: SEVEN_DAYS_IN_SECONDS,
  },
  providers: [
    CredentialsProvider({
      id: "credentials",
      credentials: {
        username: { label: "Username", type: "text", placeholder: "jsmith" },
        password: { label: "Password", type: "password" },
      },
      async authorize({ username, password }) {
        try {
          if (!password) {
            console.log("[AUTH] No password provided");
            return null;
          }

          console.log(`[AUTH] Login attempt for: ${username}`);

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
                  publisher: { select: { white_label: true, slug: true } },
                },
              },
            },
          });

          if (user) {
            console.log(`[AUTH] User found: id=${user.id}, active=${user.active}, email_verified=${!!user.email_verified_at}`);
          } else {
            console.log(`[AUTH] User NOT found for: ${username}`);
          }

          if (user && user.active) {
            const pwMatch = await compare(password as string, user.password);
            console.log(`[AUTH] Password match: ${pwMatch}`);

            if (pwMatch) {

              // ── Email verification gate ──────────────────────────────────
              if (!user.email_verified_at) {
                const roleNames = user.claims
                  .map((claim) => claim.role_name?.toLowerCase())
                  .filter((roleName): roleName is string => Boolean(roleName));
                const isProtectedRole = roleNames.some(
                  (roleName) => roleName === "publisher" || roleName === "author"
                );
                console.log(`[AUTH] Email not verified. Protected roles: ${roleNames.join(",")}, isProtected: ${isProtectedRole}`);
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
                const isPlatformPublisher = user.author.publisher?.slug === "iwacumo";
                console.log(`[AUTH] Author check: publisher_id=${user.author.publisher_id}, white_label=${isWhiteLabel}, slug=${user.author.publisher?.slug}`);
                if (!isWhiteLabel && !isPlatformPublisher) {
                  throw new Error("AUTHOR_NOT_PERMITTED");
                }
              }

              console.log(`[AUTH] Login SUCCESS for user: ${user.id}`);
              return {
                id:         user.id,
                email:      user.email,
                first_name: user.first_name,
                last_name:  user.last_name || "",
                username:   user.username || null,
              };
            } else {
              console.log(`[AUTH] Password INCORRECT for user: ${user.id}`);
            }
          } else if (user && !user.active) {
            console.log(`[AUTH] User is INACTIVE: ${user.id}`);
          }

          // ── 2. Check AdminUser table ───────────────────────────────────────
          const adminUser = await prisma.adminUser.findFirst({
            where: { email: username as string },
          });

          if (adminUser) {
            console.log(`[AUTH] Admin found: id=${adminUser.id}, status=${adminUser.status}, email_verified=${!!adminUser.email_verified_at}`);
          } else {
            console.log(`[AUTH] Admin NOT found for: ${username}`);
          }

          if (
            adminUser &&
            adminUser.status === "active" &&
            adminUser.password_hash
          ) {
            if (await compare(password as string, adminUser.password_hash)) {
              if (!adminUser.email_verified_at) {
                throw new Error("EMAIL_NOT_VERIFIED");
              }
              console.log(`[AUTH] Login SUCCESS for admin: ${adminUser.id}`);
              return {
                id:         adminUser.id,
                email:      adminUser.email,
                first_name: adminUser.first_name || "",
                last_name:  adminUser.last_name  || "",
                username:   adminUser.email.split("@")[0] || null,
              };
            } else {
              console.log(`[AUTH] Admin password INCORRECT: ${adminUser.id}`);
            }
          } else if (adminUser) {
            console.log(`[AUTH] Admin not eligible: status=${adminUser.status}, hasPassword=${!!adminUser.password_hash}`);
          }

          console.log(`[AUTH] Login FAILED for: ${username} — returning null`);
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
        token.username   = (user as any).username || null;
        token.avatar_url = (user as any).avatar_url || null;
        token.email_verified = (user as any).email_verified || false;
      }
      return token;
    },
    async session({ session, token }) {
      if (!token.sub) return session;

      const claims = await getUserClaims(token.sub);

      const [userProfile, adminProfile, isSuperAdmin] = await Promise.all([
        prisma.user.findUnique({
          where:   { id: token.sub },
          include: {
            author: { include: { publisher: { select: { white_label: true, slug: true } } } },
            publisher: true,
            customers: true,
          },
        }),
        prisma.adminUser.findUnique({
          where:   { id: token.sub },
          include: {
            roles:  true,
            tenant: { include: { publishers: true } },
          },
        }),
        checkIsSuperAdmin(token.sub),
      ]);

      const author_id    = userProfile?.author?.id    || null;
      let publisher_id   = userProfile?.publisher?.id || null;
      const isEmailVerified = !!userProfile?.email_verified_at || !!adminProfile?.email_verified_at;
      const username     =
        userProfile?.username
        || userProfile?.email?.split("@")[0]
        || adminProfile?.email?.split("@")[0]
        || null;
      const avatar_url   =
        userProfile?.publisher?.profile_picture
        || userProfile?.author?.profile_picture
        || null;
      const authorRequiresKyc = !!userProfile?.author?.publisher?.white_label;

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

      const availableProfiles: DashboardProfile[] = [];

      if (adminProfile || isSuperAdmin) {
        availableProfiles.push("staff");
      }
      if (userProfile?.publisher && isEmailVerified) {
        availableProfiles.push("publisher");
      }
      if (author_id && isEmailVerified) {
        availableProfiles.push("author");
      }
      if (hasCustomerProfiles) {
        availableProfiles.push("reader");
      }

      const uniqueProfiles = Array.from(new Set(availableProfiles));
      const cookieStore = await cookies();
      const requestedProfile = cookieStore.get(ACTIVE_PROFILE_COOKIE)?.value ?? null;
      const activeProfile =
        requestedProfile
          ? resolveActiveProfile(uniqueProfiles, requestedProfile)
          : isSuperAdmin && uniqueProfiles.includes("staff")
            ? "staff"
            : resolveActiveProfile(uniqueProfiles, requestedProfile);

      return {
        ...session,
        user: {
          id:         token.sub,
          first_name: (token.name as string)      || "",
          last_name:  (token.last_name as string)  || "",
          email:      (token.email as string)      || "",
          username,
          avatar_url,
          email_verified: isEmailVerified,
          author_id,
          publisher_id,
          isCustomer: hasCustomerProfiles,
          author_requires_kyc: authorRequiresKyc,
        },
        ...claims,
        roles: finalizedRoles,
        availableProfiles: uniqueProfiles,
        activeProfile,
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
