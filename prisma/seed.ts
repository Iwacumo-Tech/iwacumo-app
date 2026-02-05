import * as fs from "fs/promises";
import { ParseArgsConfig } from "util";
import { PrismaClient, Role } from "@prisma/client";
import { parseArgs } from "node:util";
import { PERMISSIONS } from "@/lib/constants";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const config: ParseArgsConfig = { options: { environment: { type: "string" } } };

export const permissions = [
  { name: PERMISSIONS.SUPER_ADMIN, module: "super-admin" },
  { name: PERMISSIONS.PUBLISHER, module: "publisher" },
  { name: PERMISSIONS.AUTHOR, module: "author" },
  { name: PERMISSIONS.CUSTOMER, module: "customer" },
  { name: PERMISSIONS.OWNER, module: "owner" }
];

// Core roles required for the Gated Community logic
const coreRoles = ["super-admin", "publisher", "author", "customer"];

async function seedTenants() {
  const booka = {
    name: "Booka",
    custom_domain: "https://booka.africa",
    slug: "booka",
    contact_email: "support@booka.africa",
  };

  await prisma.tenant.upsert({
    where: { slug: booka.slug },
    update: {
      name: booka.name,
      custom_domain: booka.custom_domain,
      contact_email: booka.contact_email,
    },
    create: { ...booka },
  });

  // Seed Permissions using findFirst to avoid Unique constraint errors
  await Promise.all(
    permissions.map(async (permission) => {
      const existingPermission = await prisma.permission.findFirst({
        where: {
          name: permission.name,
          module: permission.module,
        },
      });

      if (!existingPermission) {
        await prisma.permission.create({
          data: {
            name: permission.name,
            action: permission.name,
            module: permission.module,
          },
        });
      }
    })
  );

  console.log("Tenant and Permissions seeding complete");
}

async function seedPermissionsAndRoles() {
  // 1. Seed Core Roles (all lowercase to match backend logic)
  for (const roleName of coreRoles) {
    await prisma.role.upsert({
      where: { name: roleName },
      update: { active: true },
      create: {
        name: roleName,
        built_in: true,
        active: true,
      },
    });
  }

  // 2. Map Permissions to Roles
  const rolePermissionMap: Record<string, string> = {
    "super-admin": PERMISSIONS.SUPER_ADMIN,
    "publisher": PERMISSIONS.PUBLISHER,
    "author": PERMISSIONS.AUTHOR,
    "customer": PERMISSIONS.CUSTOMER,
  };

  for (const [roleName, permissionName] of Object.entries(rolePermissionMap)) {
    const permission = await prisma.permission.findFirst({ 
      where: { name: permissionName } 
    });

    if (permission) {
      const existingPermissionRole = await prisma.permissionRole.findFirst({
        where: {
          role_name: roleName,
          permission_id: permission.id,
        },
      });

      if (!existingPermissionRole) {
        await prisma.permissionRole.create({
          data: {
            role_name: roleName,
            permission_id: permission.id,
            active: true,
          },
        });
      }
    }
  }

  console.log("Roles and Permission Mapping complete");
}

async function seedDefaultPublisher() {
  const bookaTenant = await prisma.tenant.findUnique({ where: { slug: "booka" } });
  const superAdmin = await prisma.user.findUnique({ where: { email: "super.admin@yopmail.com" } });

  if (bookaTenant && superAdmin) {
    // This is the "House Account" that authors will be attached to by default
    await prisma.publisher.upsert({
      where: { user_id: superAdmin.id },
      update: { tenant_id: bookaTenant.id, slug: "booka" },
      create: {
        user_id: superAdmin.id,
        tenant_id: bookaTenant.id,
        slug: "booka"
      }
    });
    console.log("Default Platform Publisher (Booka) is ready.");
  }
}

async function seedUsers() {
  const super_admin = {
    first_name: "Super",
    last_name: "Admin",
    email: "super.admin@yopmail.com",
    password: "secret",
  };

  const superAdminPermission = await prisma.permission.findFirst({
    where: { name: PERMISSIONS.SUPER_ADMIN }
  });

  if (!superAdminPermission) return;

  try {
    const superAdmin = await prisma.user.upsert({
      where: { email: super_admin.email },
      update: {
        first_name: super_admin.first_name,
        last_name: super_admin.last_name,
      },
      create: {
        ...super_admin,
        password: bcrypt.hashSync(super_admin.password, 10),
        username: "superadmin",
        claims: {
          create: {
            permission_id: superAdminPermission.id,
            type: "PERMISSION",
            active: true,
            tenant_slug: "booka",
          }
        }
      },
    });

    const bookaTenant = await prisma.tenant.findUnique({ where: { slug: "booka" } });
    
    if (bookaTenant) {
      // 1. Check if a publisher already exists for this tenant
      const existingPublisherByTenant = await prisma.publisher.findUnique({
        where: { tenant_id: bookaTenant.id }
      });

      // 2. Check if a publisher already exists for this user
      const existingPublisherByUser = await prisma.publisher.findUnique({
        where: { user_id: superAdmin.id }
      });

      if (!existingPublisherByTenant && !existingPublisherByUser) {
        // Safe to create new link
        await prisma.publisher.create({
          data: {
            user_id: superAdmin.id,
            tenant_id: bookaTenant.id,
            slug: "booka"
          }
        });
      } else if (existingPublisherByUser && existingPublisherByUser.tenant_id !== bookaTenant.id) {
        // If user is a publisher but linked to wrong tenant, update if tenant is free
        if (!existingPublisherByTenant) {
          await prisma.publisher.update({
            where: { user_id: superAdmin.id },
            data: { tenant_id: bookaTenant.id }
          });
        }
      }
    }
  } catch (err) {
    console.log("Seed user error: ", err);
  }
  console.log("Users seeding complete");
}

async function seedCategories() {
  const categories = [
    { name: "Business & Money", slug: "business-money" },
    { name: "Self-Improvement", slug: "self-improvement" },
    { name: "Fiction", slug: "fiction" },
    { name: "Education & Academic", slug: "education" },
    { name: "Comics & Graphic Novels", slug: "comics" },
    { name: "Technology", slug: "technology" },
    { name: "African Literature", slug: "african-lit" },
    { name: "Health & Fitness", slug: "health" },
    { name: "General", slug: "general" },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }
  console.log("Categories complete");
}

async function seedProd() {
  try {
    await seedCategories();
    await seedTenants();
    await seedPermissionsAndRoles();
    await seedUsers();
    await seedDefaultPublisher();
  } catch (error) {
    console.error("Seed error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const { values: { environment } } = parseArgs(config);
  // We run seedProd to ensure all roles (especially 'author') are created
  await seedProd();
}

main();