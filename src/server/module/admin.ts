import bcrypt from "bcryptjs";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { publicProcedure } from "@/server/trpc";
import {
  createAdminUserSchema,
  updateAdminUserSchema,
  assignRoleToAdminUserSchema,
  removeRoleFromAdminUserSchema,
  getAdminUserByIdSchema,
  deleteAdminUserSchema,
} from "@/server/dtos";

/**
 * Admin Module
 * Location: src/server/module/admin.ts
 * * Phase C Update: Added getGlobalPlatformStats for platform-wide metrics.
 * * Maintains all staff management, role scoping, and helper permissions logic.
 */

/**
 * Global Platform Analytics (Phase C)
 * Provides high-level metrics for the Super Admin Dashboard
 */
export const getGlobalPlatformStats = publicProcedure.query(async () => {
  const [tenantCount, totalRevenue, orderCount] = await Promise.all([
    // 1. Total Tenants count
    prisma.tenant.count({
      where: { deleted_at: null },
    }),
    // 2. Aggregate Revenue and Platform Fees
    prisma.orderLineItem.aggregate({
      where: {
        order: { payment_status: "captured" },
      },
      _sum: {
        platform_fee: true,
        total_price: true,
      },
    }),
    // 3. Successful Orders count
    prisma.order.count({
      where: { payment_status: "captured" },
    }),
  ]);

  // 4. Fetch Top Tenants
  // FIXED: Removed 'publishers' from _count select as it was causing the 500 error.
  // Using 'admin_users' and 'users' which Prisma confirmed are valid options.
  const topTenants = await prisma.tenant.findMany({
    take: 5,
    where: { deleted_at: null },
    orderBy: {
      created_at: 'desc'
    },
    include: {
      _count: {
        select: { 
          admin_users: true,
          users: true 
        },
      },
    },
  });

  return {
    totalTenants: tenantCount,
    platformTotalEarnings: totalRevenue._sum.platform_fee || 0,
    totalGMV: totalRevenue._sum.total_price || 0,
    successfulOrders: orderCount,
    topTenants: topTenants.map(tenant => ({
      ...tenant,
      // Fallback: If your UI specifically looks for 'publishers', 
      // we map the admin_users count to it for compatibility.
      publisherCount: tenant._count.admin_users 
    })),
  };
});

/**
 * Create a new AdminUser
 * AdminUsers are staff members who can have roles scoped to publishers
 */
export const createAdminUser = publicProcedure
  .input(createAdminUserSchema)
  .mutation(async (opts) => {
    const { email, password, first_name, last_name, tenant_id, role_name, publisher_id, status } = opts.input;

    // Check if email already exists
    const existingAdmin = await prisma.adminUser.findUnique({
      where: { email },
    });

    if (existingAdmin) {
      throw new Error("Admin user with this email already exists");
    }

    // Verify tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenant_id },
    });

    if (!tenant) {
      throw new Error("Tenant/Organization not found");
    }

    // Hash password if provided
    const password_hash = password ? bcrypt.hashSync(password, 10) : null;

    // Create admin user and optionally assign role in a transaction
    const adminUser = await prisma.$transaction(async (tx) => {
      const createdAdminUser = await tx.adminUser.create({
        data: {
          email,
          password_hash,
          first_name,
          last_name,
          tenant_id,
          status: status || "invited",
        },
      });

      // If role_name is provided, assign the role
      if (role_name) {
        // Verify role exists
        const role = await tx.role.findUnique({
          where: { name: role_name },
        });

        if (!role) {
          throw new Error("Role not found");
        }

        // If publisher_id is provided, verify it belongs to the tenant
        if (publisher_id) {
          const publisher = await tx.publisher.findUnique({
            where: { id: publisher_id },
          });

          if (!publisher) {
            throw new Error("Publisher not found");
          }

          if (publisher.tenant_id !== tenant_id) {
            throw new Error("Publisher does not belong to the specified tenant");
          }
        }

        // Create the role assignment
        await tx.adminUserRole.create({
          data: {
            admin_user_id: createdAdminUser.id,
            tenant_id,
            role_name,
            publisher_id: publisher_id || null,
          },
        });
      }

      // Return the admin user with roles
      return await tx.adminUser.findUnique({
        where: { id: createdAdminUser.id },
        include: {
          roles: {
            include: {
              role: {
                include: {
                  permissions: {
                    include: {
                      permission: true,
                    },
                  },
                },
              },
            },
          },
          tenant: true,
        },
      });
    });

    return adminUser;
  });

/**
 * Update an AdminUser
 */
export const updateAdminUser = publicProcedure
  .input(updateAdminUserSchema)
  .mutation(async (opts) => {
    const { id, email, password, first_name, last_name, tenant_id, status } = opts.input;

    // Verify tenant exists if tenant_id is being updated
    if (tenant_id !== undefined) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenant_id },
      });

      if (!tenant) {
        throw new Error("Tenant/Organization not found");
      }
    }

    const updateData: any = {};
    if (email !== undefined) updateData.email = email;
    if (first_name !== undefined) updateData.first_name = first_name;
    if (last_name !== undefined) updateData.last_name = last_name;
    if (tenant_id !== undefined) updateData.tenant_id = tenant_id;
    if (status !== undefined) updateData.status = status;
    if (password !== undefined) {
      updateData.password_hash = bcrypt.hashSync(password, 10);
    }

    const adminUser = await prisma.adminUser.update({
      where: { id },
      data: updateData,
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
        tenant: true,
      },
    });

    return adminUser;
  });

/**
 * Assign a role to an AdminUser
 */
export const assignRoleToAdminUser = publicProcedure
  .input(assignRoleToAdminUserSchema)
  .mutation(async (opts) => {
    const { admin_user_id, tenant_id, role_name, publisher_id, expires_at } = opts.input;

    const adminUser = await prisma.adminUser.findUnique({
      where: { id: admin_user_id },
      include: { tenant: true },
    });

    if (!adminUser) {
      throw new Error("Admin user not found");
    }

    if (adminUser.tenant_id !== tenant_id) {
      throw new Error("Admin user does not belong to the specified tenant");
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenant_id },
    });

    if (!tenant) {
      throw new Error("Tenant not found");
    }

    const role = await prisma.role.findUnique({
      where: { name: role_name },
    });

    if (!role) {
      throw new Error("Role not found");
    }

    if (publisher_id) {
      const publisher = await prisma.publisher.findUnique({
        where: { id: publisher_id },
      });

      if (!publisher) {
        throw new Error("Publisher not found");
      }

      if (publisher.tenant_id !== tenant_id) {
        throw new Error("Publisher does not belong to the specified tenant");
      }
    }

    const existingRole = await prisma.adminUserRole.findFirst({
      where: {
        admin_user_id,
        tenant_id,
        role_name,
        publisher_id: publisher_id || null,
      },
    });

    if (existingRole) {
      throw new Error("Role already assigned to this admin user for this tenant and publisher");
    }

    const adminUserRole = await prisma.adminUserRole.create({
      data: {
        admin_user_id,
        tenant_id,
        role_name,
        publisher_id: publisher_id || null,
        expires_at: expires_at || null,
      },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
        tenant: true,
        publisher: publisher_id ? true : undefined,
      },
    });

    return adminUserRole;
  });

/**
 * Remove a role from an AdminUser
 */
export const removeRoleFromAdminUser = publicProcedure
  .input(removeRoleFromAdminUserSchema)
  .mutation(async (opts) => {
    const { admin_user_id, tenant_id, role_name, publisher_id } = opts.input;

    const deleted = await prisma.adminUserRole.deleteMany({
      where: {
        admin_user_id,
        tenant_id,
        role_name,
        publisher_id: publisher_id || null,
      },
    });

    return { success: deleted.count > 0 };
  });

/**
 * Get all AdminUsers
 */
export const getAllAdminUsers = publicProcedure.query(async () => {
  return await prisma.adminUser.findMany({
    include: {
      roles: {
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
      tenant: true,
    },
    orderBy: {
      created_at: "desc",
    },
  });
});

/**
 * Get AdminUsers by Tenant ID
 */
export const getAdminUsersByTenant = publicProcedure
  .input(z.object({ tenant_id: z.string() }))
  .query(async (opts) => {
    return await prisma.adminUser.findMany({
      where: {
        tenant_id: opts.input.tenant_id,
      },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
        tenant: true,
      },
      orderBy: {
        created_at: "desc",
      },
    });
  });

/**
 * Get AdminUser by ID with roles and permissions
 */
export const getAdminUserById = publicProcedure
  .input(getAdminUserByIdSchema)
  .query(async (opts) => {
    return await prisma.adminUser.findUnique({
      where: { id: opts.input.id },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  where: {
                    active: true,
                  },
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
        tenant: true,
      },
    });
  });

/**
 * Delete (soft delete) an AdminUser
 */
export const deleteAdminUser = publicProcedure
  .input(deleteAdminUserSchema)
  .mutation(async (opts) => {
    return await prisma.adminUser.delete({
      where: { id: opts.input.id },
    });
  });

/**
 * Get all roles available for AdminUsers
 */
export const getAdminRoles = publicProcedure.query(async () => {
  return await prisma.role.findMany({
    where: {
      active: true,
    },
    include: {
      permissions: {
        where: {
          active: true,
        },
        include: {
          permission: true,
        },
      },
    },
  });
});

/**
 * Helper function to get all permissions for an AdminUser
 */
export async function getAdminUserPermissions(adminUserId: string, tenantId?: string, publisherId?: string) {
  const whereClause: any = {
    OR: [
      { expires_at: null },
      { expires_at: { gt: new Date() } },
    ],
  };

  if (tenantId) whereClause.tenant_id = tenantId;
  if (publisherId) whereClause.publisher_id = publisherId;

  const adminUser = await prisma.adminUser.findUnique({
    where: { id: adminUserId },
    include: {
      roles: {
        where: whereClause,
        include: {
          role: {
            include: {
              permissions: {
                where: {
                  active: true,
                },
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!adminUser) {
    return { permissions: [], roles: [] };
  }

  const permissionsSet = new Set<string>();
  const permissions: any[] = [];
  const roles: any[] = [];

  adminUser.roles.forEach((adminUserRole) => {
    roles.push(adminUserRole.role);
    adminUserRole.role.permissions.forEach((permissionRole) => {
      const permId = permissionRole.permission.id;
      if (!permissionsSet.has(permId)) {
        permissionsSet.add(permId);
        permissions.push(permissionRole.permission);
      }
    });
  });

  return { permissions, roles };
}

/**
 * Helper function to check if AdminUser has a specific permission
 */
export async function hasAdminPermission(
  adminUserId: string,
  permissionName: string,
  module?: string,
  action?: string,
  tenantId?: string,
  publisherId?: string
): Promise<boolean> {
  const { permissions } = await getAdminUserPermissions(adminUserId, tenantId, publisherId);

  return permissions.some((perm) => {
    if (module && action) {
      return (
        perm.name === permissionName &&
        perm.module === module &&
        perm.action === action
      );
    }
    return perm.name === permissionName;
  });
}

/**
 * Helper function to check if AdminUser has a specific role
 */
export async function hasAdminRole(
  adminUserId: string,
  roleName: string,
  tenantId?: string,
  publisherId?: string
): Promise<boolean> {
  const whereClause: any = {
    role_name: roleName,
    OR: [
      { expires_at: null },
      { expires_at: { gt: new Date() } },
    ],
  };

  if (tenantId) whereClause.tenant_id = tenantId;
  if (publisherId) whereClause.publisher_id = publisherId;

  const adminUser = await prisma.adminUser.findUnique({
    where: { id: adminUserId },
    include: {
      roles: {
        where: whereClause,
      },
    },
  });

  return adminUser ? adminUser.roles.length > 0 : false;
}