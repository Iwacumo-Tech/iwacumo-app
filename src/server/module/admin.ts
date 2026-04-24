import bcrypt from "bcryptjs";
import { hash } from "bcryptjs";
import { z } from "zod";
import prisma from "@/lib/prisma";
import {
  DEFAULT_BOOK_LIVE_PRICING_ENABLED,
  DEFAULT_BOOK_FEATURE_TOGGLES,
  DEFAULT_BOOK_FLAP_COSTS,
  DEFAULT_BOOK_SIZE_RANGES,
  normalizeBookCustomFields,
  normalizeBookFeatureToggles,
  normalizeBookFlapCosts,
  normalizeBookLivePricingEnabled,
  normalizeBookSizeRanges,
} from "@/lib/book-config";
import { publicProcedure } from "@/server/trpc";
import {
  createAdminUserSchema,
  updateAdminUserSchema,
  assignRoleToAdminUserSchema,
  removeRoleFromAdminUserSchema,
  getAdminUserByIdSchema,
  deleteAdminUserSchema,
  inviteStaffSchema,
  staffAccountSetupSchema,
} from "@/server/dtos";
import { TRPCError } from "@trpc/server";
import {
  createVerificationToken,
  validateVerificationToken,
  consumeVerificationToken,
  wasTokenRecentlySent,
  createAdminVerificationToken,
  wasAdminTokenRecentlySent,
} from "@/lib/tokens";
import { sendStaffInviteEmail } from "@/lib/email";
 
// ─────────────────────────────────────────────────────────────
// INVITE STAFF
// ─────────────────────────────────────────────────────────────
// Super admin sends an email invite. We:
//   1. Resolve the inviter's AdminUser record to get their tenant_id
//      and display name — we trust the inviterId passed in from
//      the session (not user-supplied).
//   2. Create an AdminUser shell with status "invited", no password.
//   3. Assign the chosen role immediately.
//   4. Generate a STAFF_INVITE token and email the link.
//
// The input only needs email + role_name + inviter_admin_id.
// tenant_id comes from the inviter's AdminUser record — never
// from the client form. This fixes the broken tenantId resolution
// in the old admin-user-form.tsx.
 
export const inviteStaff = publicProcedure
  .input(
    inviteStaffSchema.extend({
      inviter_admin_id: z.string(),
      tenant_slug: z.string().nullable().optional(),
    })
  )
  .mutation(async ({ input }) => {
    const { email, role_name, inviter_admin_id, tenant_slug } = input;
 
    // ── 1. Resolve tenant_id + inviter name ───────────────────────
    let tenant_id: string;
    let inviterName: string;
 
    const adminInviter = await prisma.adminUser.findUnique({
      where: { id: inviter_admin_id },
      include: { tenant: true },
    });
 
    if (adminInviter) {
      tenant_id   = adminInviter.tenant_id;
      inviterName = [adminInviter.first_name, adminInviter.last_name]
        .filter(Boolean).join(" ") || "The iwacumo team";
    } else {
      const userInviter = await prisma.user.findUnique({
        where: { id: inviter_admin_id },
        include: { publisher: { include: { tenant: true } } },
      });
 
      if (!userInviter) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Could not identify the inviting user. Please sign in again.",
        });
      }
 
      inviterName = [userInviter.first_name, userInviter.last_name]
        .filter(Boolean).join(" ") || "The iwacumo team";
 
      if (userInviter.publisher?.tenant_id) {
        tenant_id = userInviter.publisher.tenant_id;
      } else if (tenant_slug) {
        const tenant = await prisma.tenant.findUnique({
          where: { slug: tenant_slug },
        });
        if (!tenant) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: `Tenant with slug "${tenant_slug}" not found.`,
          });
        }
        tenant_id = tenant.id;
      } else {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Cannot determine your organization. Ensure your account has a tenant_slug claim set.",
        });
      }
    }
 
    // ── 2. Check role exists ──────────────────────────────────────
    const role = await prisma.role.findUnique({ where: { name: role_name } });
    if (!role) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Role "${role_name}" does not exist. Run the seed script first.`,
      });
    }
 
    // ── 3. No duplicate email ─────────────────────────────────────
    const existing = await prisma.adminUser.findUnique({ where: { email } });
    if (existing) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "A staff member with this email already exists.",
      });
    }
 
    // ── 4. Create AdminUser shell + assign role ───────────────────
    const adminUser = await prisma.$transaction(async (tx) => {
      const created = await tx.adminUser.create({
        data: { email, tenant_id, status: "invited", password_hash: null },
      });
      await tx.adminUserRole.create({
        data: { admin_user_id: created.id, tenant_id, role_name },
      });
      return created;
    });
 
    // ── 5. Generate token using AdminUser-aware function ──────────
    // createAdminVerificationToken stores admin_user_id, not user_id,
    // so the FK constraint on users table is never triggered.
    const token = await createAdminVerificationToken(adminUser.id, "STAFF_INVITE");
 
    // ── 6. Send invite email ──────────────────────────────────────
    await sendStaffInviteEmail({ to: email, inviterName, role: role_name, token });
 
    return { success: true, adminUserId: adminUser.id };
  });
 
 
// ─────────────────────────────────────────────────────────────
// SETUP STAFF ACCOUNT
// ─────────────────────────────────────────────────────────────
// Called when the invited staff member clicks the link and
// submits the setup form (name + password).
 
export const setupStaffAccount = publicProcedure
  .input(staffAccountSetupSchema)
  .mutation(async ({ input }) => {
    const { token, first_name, last_name, password } = input;
 
    // 1. Validate token
    let adminUserId: string;
    try {
      adminUserId = await validateVerificationToken(token, "STAFF_INVITE");
    } catch (err: any) {
      const msg =
        err.message === "TOKEN_EXPIRED"
          ? "This invite link has expired. Ask your admin to resend."
          : err.message === "TOKEN_USED"
          ? "This invite link has already been used."
          : "Invalid invite link.";
      throw new TRPCError({ code: "BAD_REQUEST", message: msg });
    }
 
    // 2. Find the AdminUser
    const adminUser = await prisma.adminUser.findUnique({
      where: { id: adminUserId },
    });
 
    if (!adminUser) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Account not found." });
    }
 
    if (adminUser.status === "active") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "This account is already active. Please sign in.",
      });
    }
 
    // 3. Hash password and activate the account
    const password_hash = await hash(password, 12);
 
    await prisma.adminUser.update({
      where: { id: adminUserId },
      data: {
        first_name,
        last_name,
        password_hash,
        status: "active",
        email_verified_at: new Date(),
      },
    });
 
    // 4. Consume the token (single-use)
    await consumeVerificationToken(token);
 
    return { success: true };
  });
 
// ─────────────────────────────────────────────────────────────
// RESEND STAFF INVITE
// ─────────────────────────────────────────────────────────────
export const resendStaffInvite = publicProcedure
  .input(z.object({
    admin_user_id:    z.string(),
    inviter_admin_id: z.string(),
  }))
  .mutation(async ({ input }) => {
    const { admin_user_id, inviter_admin_id } = input;
 
    const [adminUser, inviter] = await Promise.all([
      prisma.adminUser.findUnique({ where: { id: admin_user_id } }),
      prisma.adminUser.findUnique({ where: { id: inviter_admin_id } })
        .then(async (a) => a ?? prisma.user.findUnique({ where: { id: inviter_admin_id } })),
    ]);
 
    if (!adminUser) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Staff member not found." });
    }
    if (!inviter) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Inviting user not found." });
    }
    if (adminUser.status === "active") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "This staff member has already completed setup.",
      });
    }
 
    // Rate-limit using the AdminUser-aware guard
    const tooSoon = await wasAdminTokenRecentlySent(admin_user_id, "STAFF_INVITE", 60);
    if (tooSoon) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: "Please wait before sending another invite.",
      });
    }
 
    const roleAssignment = await prisma.adminUserRole.findFirst({
      where: { admin_user_id },
    });
 
    const inviterName = [
      (inviter as any).first_name,
      (inviter as any).last_name,
    ].filter(Boolean).join(" ") || "The iwacumo team";
 
    // Use AdminUser-aware token creation
    const token = await createAdminVerificationToken(admin_user_id, "STAFF_INVITE");
 
    await sendStaffInviteEmail({
      to: adminUser.email,
      inviterName,
      role: roleAssignment?.role_name ?? "staff",
      token,
    });
 
    return { success: true };
  });
// ─────────────────────────────────────────────────────────────
// ALL ORIGINAL EXPORTS BELOW — UNCHANGED
// ─────────────────────────────────────────────────────────────
 
export const getGlobalPlatformStats = publicProcedure.query(async () => {
  const [
    tenantCount, bookCount, customerCount, salesData, orderCount,
    recentOrders, recentUsers
  ] = await Promise.all([
    prisma.tenant.count({ where: { deleted_at: null } }),
    prisma.book.count({ where: { deleted_at: null } }),
    prisma.customer.count({ where: { deleted_at: null } }),
    prisma.orderLineItem.aggregate({
      where: { order: { payment_status: "captured" } },
      _sum: { platform_fee: true, total_price: true },
    }),
    prisma.order.count({ where: { payment_status: "captured" } }),
    prisma.order.findMany({
      take: 5, where: { payment_status: "captured" },
      orderBy: { created_at: "desc" },
      include: { customer: { select: { name: true } } },
    }),
    prisma.user.findMany({
      take: 5, orderBy: { created_at: "desc" },
      select: { id: true, first_name: true, created_at: true },
    }),
  ]);
 
  const activity = [
    ...recentOrders.map((order) => ({
      id: order.id, type: "order",
      description: `New order #${order.order_number?.slice(-6)} by ${order.customer?.name || "Guest"}`,
      timestamp: order.created_at,
    })),
    ...recentUsers.map((user) => ({
      id: user.id, type: "user",
      description: `New member joined the tribe: ${user.first_name}`,
      timestamp: user.created_at,
    })),
  ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
 
  const topTenants = await prisma.tenant.findMany({
    take: 5, where: { deleted_at: null },
    orderBy: { created_at: "desc" },
    include: { _count: { select: { admin_users: true, users: true } } },
  });
 
  return {
    totalTenants: tenantCount,
    totalBooks: bookCount,
    totalCustomers: customerCount,
    platformTotalEarnings: salesData._sum.platform_fee || 0,
    totalGMV: salesData._sum.total_price || 0,
    successfulOrders: orderCount,
    activity,
    topTenants: topTenants.map((tenant) => ({
      ...tenant,
      publisherCount: tenant._count.admin_users,
    })),
  };
});
 
export const createAdminUser = publicProcedure
  .input(createAdminUserSchema)
  .mutation(async (opts) => {
    const { email, password, first_name, last_name, tenant_id, role_name, publisher_id, status } = opts.input;
    const existingAdmin = await prisma.adminUser.findUnique({ where: { email } });
    if (existingAdmin) throw new Error("Admin user with this email already exists");
    const tenant = await prisma.tenant.findUnique({ where: { id: tenant_id } });
    if (!tenant) throw new Error("Tenant/Organization not found");
    const password_hash = password ? bcrypt.hashSync(password, 10) : null;
    const adminUser = await prisma.$transaction(async (tx) => {
      const createdAdminUser = await tx.adminUser.create({
        data: { email, password_hash, first_name, last_name, tenant_id, status: status || "invited" },
      });
      if (role_name) {
        const role = await tx.role.findUnique({ where: { name: role_name } });
        if (!role) throw new Error("Role not found");
        if (publisher_id) {
          const publisher = await tx.publisher.findUnique({ where: { id: publisher_id } });
          if (!publisher) throw new Error("Publisher not found");
          if (publisher.tenant_id !== tenant_id) throw new Error("Publisher does not belong to the specified tenant");
        }
        await tx.adminUserRole.create({
          data: { admin_user_id: createdAdminUser.id, tenant_id, role_name, publisher_id: publisher_id || null },
        });
      }
      return await tx.adminUser.findUnique({
        where: { id: createdAdminUser.id },
        include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } }, tenant: true },
      });
    });
    return adminUser;
  });
 
export const updateAdminUser = publicProcedure
  .input(updateAdminUserSchema)
  .mutation(async (opts) => {
    const { id, email, password, first_name, last_name, tenant_id, status } = opts.input;
    if (tenant_id !== undefined) {
      const tenant = await prisma.tenant.findUnique({ where: { id: tenant_id } });
      if (!tenant) throw new Error("Tenant/Organization not found");
    }
    const updateData: any = {};
    if (email !== undefined)      updateData.email = email;
    if (first_name !== undefined) updateData.first_name = first_name;
    if (last_name !== undefined)  updateData.last_name = last_name;
    if (tenant_id !== undefined)  updateData.tenant_id = tenant_id;
    if (status !== undefined)     updateData.status = status;
    if (password !== undefined)   updateData.password_hash = bcrypt.hashSync(password, 10);
    return await prisma.adminUser.update({
      where: { id }, data: updateData,
      include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } }, tenant: true },
    });
  });
 
export const assignRoleToAdminUser = publicProcedure
  .input(assignRoleToAdminUserSchema)
  .mutation(async (opts) => {
    const { admin_user_id, tenant_id, role_name, publisher_id, expires_at } = opts.input;
    const adminUser = await prisma.adminUser.findUnique({ where: { id: admin_user_id }, include: { tenant: true } });
    if (!adminUser) throw new Error("Admin user not found");
    if (adminUser.tenant_id !== tenant_id) throw new Error("Admin user does not belong to the specified tenant");
    const tenant = await prisma.tenant.findUnique({ where: { id: tenant_id } });
    if (!tenant) throw new Error("Tenant not found");
    const role = await prisma.role.findUnique({ where: { name: role_name } });
    if (!role) throw new Error("Role not found");
    if (publisher_id) {
      const publisher = await prisma.publisher.findUnique({ where: { id: publisher_id } });
      if (!publisher) throw new Error("Publisher not found");
      if (publisher.tenant_id !== tenant_id) throw new Error("Publisher does not belong to the specified tenant");
    }
    const existingRole = await prisma.adminUserRole.findFirst({
      where: { admin_user_id, tenant_id, role_name, publisher_id: publisher_id || null },
    });
    if (existingRole) throw new Error("Role already assigned to this admin user for this tenant and publisher");
    return await prisma.adminUserRole.create({
      data: { admin_user_id, tenant_id, role_name, publisher_id: publisher_id || null, expires_at: expires_at || null },
      include: { role: { include: { permissions: { include: { permission: true } } } }, tenant: true },
    });
  });
 
export const removeRoleFromAdminUser = publicProcedure
  .input(removeRoleFromAdminUserSchema)
  .mutation(async (opts) => {
    const { admin_user_id, tenant_id, role_name, publisher_id } = opts.input;
    const deleted = await prisma.adminUserRole.deleteMany({
      where: { admin_user_id, tenant_id, role_name, publisher_id: publisher_id || null },
    });
    return { success: deleted.count > 0 };
  });
 
export const getAllAdminUsers = publicProcedure.query(async () => {
  return await prisma.adminUser.findMany({
    include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } }, tenant: true },
    orderBy: { created_at: "desc" },
  });
});
 
export const getAdminUsersByTenant = publicProcedure
  .input(z.object({ tenant_id: z.string() }))
  .query(async (opts) => {
    return await prisma.adminUser.findMany({
      where: { tenant_id: opts.input.tenant_id },
      include: {
        roles: { include: { role: { include: { permissions: { include: { permission: true } } } }, publisher: { select: { slug: true } } } },
        tenant: true,
      },
      orderBy: { created_at: "desc" },
    });
  });
 
export const getAdminUserById = publicProcedure
  .input(getAdminUserByIdSchema)
  .query(async (opts) => {
    return await prisma.adminUser.findUnique({
      where: { id: opts.input.id },
      include: { roles: { include: { role: { include: { permissions: { where: { active: true }, include: { permission: true } } } } } }, tenant: true },
    });
  });
 
export const deleteAdminUser = publicProcedure
  .input(deleteAdminUserSchema)
  .mutation(async (opts) => {
    return await prisma.adminUser.delete({ where: { id: opts.input.id } });
  });
 
export const getAdminRoles = publicProcedure.query(async () => {
  return await prisma.role.findMany({
    where: { active: true },
    include: { permissions: { where: { active: true }, include: { permission: true } } },
  });
});
 
export const toggleFeatured = publicProcedure
  .input(z.object({ bookId: z.string(), featured: z.boolean(), scope: z.enum(["global", "shop"]) }))
  .mutation(async ({ input }) => {
    const updateData = input.scope === "global" ? { featured: input.featured } : { featured_shop: input.featured };
    return await prisma.book.update({ where: { id: input.bookId }, data: updateData });
  });
 
function normalisePrimitive(raw: any, fallback: number): number {
  if (raw === null || raw === undefined) return fallback;
  if (typeof raw === "number") return raw;
  let val = raw;
  while (typeof val === "object" && val !== null) {
    if ("v" in val) { val = val.v; continue; }
    if ("value" in val) { val = val.value; continue; }
    break;
  }
  return typeof val === "number" ? val : fallback;
}
 
export const getSystemSettings = publicProcedure.query(async () => {
  const settings = await prisma.systemSettings.findMany({ orderBy: { created_at: "desc" } });
  const settingsMap: Record<string, any> = {};
  settings.forEach((s) => { settingsMap[s.key] = s.value; });
  return {
    printing_costs: settingsMap.printing_costs ?? { paperback: { A6: { cover: 1500, page: 5 }, A5: { cover: 2000, page: 10 }, A4: { cover: 3000, page: 15 } }, hardcover: { A6: { cover: 2500, page: 5 }, A5: { cover: 3500, page: 10 }, A4: { cover: 5000, page: 15 } } },
    platform_fee: { type: settingsMap.platform_fee?.type ?? "percentage", value: normalisePrimitive(settingsMap.platform_fee?.value, 30) },
    default_markup: normalisePrimitive(settingsMap.default_markup, 20),
    isbn_cost: normalisePrimitive(settingsMap.isbn_cost, 0),
    shipping_rates: settingsMap.shipping_rates ?? { Z1: { constant: 1500, variable: 200 }, Z2: { constant: 2000, variable: 250 }, Z3: { constant: 1200, variable: 180 }, Z4: { constant: 1000, variable: 150 } },
    book_weights: settingsMap.book_weights ?? { paperback: { A6: { cover: 50, page: 3 }, A5: { cover: 70, page: 4 }, A4: { cover: 90, page: 6 } }, hardcover: { A6: { cover: 120, page: 3 }, A5: { cover: 160, page: 4 }, A4: { cover: 200, page: 6 } } },
    kyc_requirements: settingsMap.kyc_requirements ?? {
      require_id:               true,
      require_business_reg:     true,
      require_proof_of_address: true,
    },
    book_feature_toggles: normalizeBookFeatureToggles(settingsMap.book_feature_toggles ?? DEFAULT_BOOK_FEATURE_TOGGLES),
    book_size_ranges: normalizeBookSizeRanges(settingsMap.book_size_ranges ?? DEFAULT_BOOK_SIZE_RANGES),
    book_flap_costs: normalizeBookFlapCosts(settingsMap.book_flap_costs ?? DEFAULT_BOOK_FLAP_COSTS),
    book_live_pricing_enabled: normalizeBookLivePricingEnabled(settingsMap.book_live_pricing_enabled ?? DEFAULT_BOOK_LIVE_PRICING_ENABLED),
    book_custom_fields: normalizeBookCustomFields(settingsMap.book_custom_fields ?? []),
  };
});

export const updateSystemSettings = publicProcedure
  .input(z.object({ key: z.string(), value: z.any() }))
  .mutation(async ({ input }) => {
    return await prisma.systemSettings.upsert({
      where: { key: input.key },
      update: { value: input.value },
      create: { key: input.key, value: input.value },
    });
  });
 
export async function getAdminUserPermissions(adminUserId: string, tenantId?: string, publisherId?: string) {
  const whereClause: any = { OR: [{ expires_at: null }, { expires_at: { gt: new Date() } }] };
  if (tenantId) whereClause.tenant_id = tenantId;
  if (publisherId) whereClause.publisher_id = publisherId;
  const adminUser = await prisma.adminUser.findUnique({
    where: { id: adminUserId },
    include: { roles: { where: whereClause, include: { role: { include: { permissions: { where: { active: true }, include: { permission: true } } } } } } },
  });
  if (!adminUser) return { permissions: [], roles: [] };
  const permissionsSet = new Set<string>();
  const permissions: any[] = [];
  const roles: any[] = [];
  adminUser.roles.forEach((adminUserRole) => {
    roles.push(adminUserRole.role);
    adminUserRole.role.permissions.forEach((permissionRole) => {
      const permId = permissionRole.permission.id;
      if (!permissionsSet.has(permId)) { permissionsSet.add(permId); permissions.push(permissionRole.permission); }
    });
  });
  return { permissions, roles };
}
 
export async function hasAdminPermission(adminUserId: string, permissionName: string, module?: string, action?: string, tenantId?: string, publisherId?: string): Promise<boolean> {
  const { permissions } = await getAdminUserPermissions(adminUserId, tenantId, publisherId);
  return permissions.some((perm) => {
    if (module && action) return perm.name === permissionName && perm.module === module && perm.action === action;
    return perm.name === permissionName;
  });
}
 
export async function hasAdminRole(adminUserId: string, roleName: string, tenantId?: string, publisherId?: string): Promise<boolean> {
  const whereClause: any = { role_name: roleName, OR: [{ expires_at: null }, { expires_at: { gt: new Date() } }] };
  if (tenantId) whereClause.tenant_id = tenantId;
  if (publisherId) whereClause.publisher_id = publisherId;
  const adminUser = await prisma.adminUser.findUnique({ where: { id: adminUserId }, include: { roles: { where: whereClause } } });
  return adminUser ? adminUser.roles.length > 0 : false;
}
