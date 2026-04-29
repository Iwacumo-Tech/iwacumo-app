import { PrismaClient } from "@prisma/client";
import { parseArgs } from "node:util";
import { ParseArgsConfig } from "util";
import { PERMISSIONS } from "@/lib/constants";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const config: ParseArgsConfig = { options: { environment: { type: "string" } } };

// ─────────────────────────────────────────────────────────────
// 1. CATEGORIES
// ─────────────────────────────────────────────────────────────
async function seedCategories() {
  const categories = [
    { name: "Business & Money",       slug: "business-money"  },
    { name: "Self-Improvement",       slug: "self-improvement" },
    { name: "Fiction",                slug: "fiction"          },
    { name: "Education & Academic",   slug: "education"        },
    { name: "Comics & Graphic Novels",slug: "comics"           },
    { name: "Technology",             slug: "technology"       },
    { name: "African Literature",     slug: "african-lit"      },
    { name: "Health & Fitness",       slug: "health"           },
    { name: "General",                slug: "general"          },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where:  { slug: cat.slug },
      update: {},
      create: cat,
    });
  }
  console.log("✓ Categories");
}

// ─────────────────────────────────────────────────────────────
// 2. TENANT (Iwacumo platform tenant)
// ─────────────────────────────────────────────────────────────
async function seedTenants() {
  await prisma.tenant.upsert({
    where:  { slug: "iwacumo" },
    update: { name: "Iwacumo", contact_email: "support@iwacumo.com" },
    create: {
      name:          "Iwacumo",
      slug:          "iwacumo",
      contact_email: "support@iwacumo.com",
      custom_domain: "https://iwacumo.com",
    },
  });
  console.log("✓ Tenant (Iwacumo)");
}

// ─────────────────────────────────────────────────────────────
// 3. CORE PERMISSIONS + ROLES (customer, author, publisher, super-admin)
// ─────────────────────────────────────────────────────────────
const corePermissions = [
  { name: PERMISSIONS.SUPER_ADMIN, module: "super-admin", action: PERMISSIONS.SUPER_ADMIN },
  { name: PERMISSIONS.PUBLISHER,   module: "publisher",   action: PERMISSIONS.PUBLISHER   },
  { name: PERMISSIONS.AUTHOR,      module: "author",      action: PERMISSIONS.AUTHOR      },
  { name: PERMISSIONS.CUSTOMER,    module: "customer",    action: PERMISSIONS.CUSTOMER    },
];

const coreRoles = ["super-admin", "publisher", "author", "customer"];

async function seedCorePermissionsAndRoles() {
  // Upsert core permissions
  for (const perm of corePermissions) {
    const existing = await prisma.permission.findFirst({
      where: { name: perm.name, module: perm.module },
    });

    if (!existing) {
      await prisma.permission.create({
        data: { name: perm.name, action: perm.action, module: perm.module },
      });
    }
  }

  // Upsert core roles
  for (const roleName of coreRoles) {
    await prisma.role.upsert({
      where:  { name: roleName },
      update: { active: true },
      create: { name: roleName, built_in: true, active: true },
    });
  }

  // Map core permissions to roles
  const rolePermissionMap: Record<string, string> = {
    "super-admin": PERMISSIONS.SUPER_ADMIN,
    "publisher":   PERMISSIONS.PUBLISHER,
    "author":      PERMISSIONS.AUTHOR,
    "customer":    PERMISSIONS.CUSTOMER,
  };

  for (const [roleName, permName] of Object.entries(rolePermissionMap)) {
    const permission = await prisma.permission.findFirst({ where: { name: permName } });
    if (!permission) continue;

    const exists = await prisma.permissionRole.findFirst({
      where: { role_name: roleName, permission_id: permission.id },
    });

    if (!exists) {
      await prisma.permissionRole.create({
        data: { role_name: roleName, permission_id: permission.id, active: true },
      });
    }
  }

  console.log("✓ Core permissions & roles");
}

// ─────────────────────────────────────────────────────────────
// 4. STAFF ROLES + PERMISSIONS
// ─────────────────────────────────────────────────────────────
// NOTE: resource_id must be '' (empty string), NOT null.
// The schema @@unique([resource_id, action, module]) treats null
// as non-comparable, which breaks upsert. Use '' consistently.

const staffPermissions = [
  // Dashboard
  { name: "view_dashboard",    module: "dashboard",  action: "read"       },
  // Books
  { name: "view_books",        module: "books",      action: "read"       },
  { name: "manage_books",      module: "books",      action: "write"      },
  { name: "approve_books",     module: "books",      action: "approve"    },
  { name: "feature_books",     module: "books",      action: "feature"    },
  // Authors
  { name: "view_authors",      module: "authors",    action: "read"       },
  { name: "manage_authors",    module: "authors",    action: "write"      },
  // Publishers
  { name: "view_publishers",   module: "publishers", action: "read"       },
  { name: "manage_publishers", module: "publishers", action: "write"      },
  { name: "manage_whitelabel", module: "publishers", action: "whitelabel" },
  // Orders & Customers
  { name: "view_orders",       module: "orders",     action: "read"       },
  { name: "view_customers",    module: "customers",  action: "read"       },
  // Admin
  { name: "manage_staff",      module: "admin",      action: "write"      },
  // Settings
  { name: "manage_settings",   module: "settings",   action: "write"      },
  // Full
  { name: "super_access",      module: "platform",   action: "all"        },
];

const staffRoles: { name: string; description: string; permissions: string[] }[] = [
  {
    name:        "staff-basic",
    description: "View-only access to dashboard, books, orders and customers",
    permissions: [
      "view_dashboard", "view_books", "view_orders",
      "view_customers", "view_authors", "view_publishers",
    ],
  },
  {
    name:        "staff-content",
    description: "Can add/edit authors, submit and approve books for publishing",
    permissions: [
      "view_dashboard", "view_books", "manage_books", "approve_books",
      "view_orders", "view_customers", "view_authors", "manage_authors", "view_publishers",
    ],
  },
  {
    name:        "staff-publisher",
    description: "Can manage publishers, authors, whitelabel stores and books",
    permissions: [
      "view_dashboard", "view_books", "manage_books", "approve_books", "feature_books",
      "view_orders", "view_customers", "view_authors", "manage_authors",
      "view_publishers", "manage_publishers", "manage_whitelabel",
    ],
  },
  {
    name:        "staff-finance",
    description: "Can view platform stats and manage system settings",
    permissions: [
      "view_dashboard", "view_orders", "view_customers",
      "view_books", "view_authors", "view_publishers", "manage_settings",
    ],
  },
  {
    name:        "super-admin",
    description: "Full platform access — all permissions",
    permissions: staffPermissions.map((p) => p.name),
  },
];

async function seedStaffRolesAndPermissions() {
  // Upsert all staff permissions
  for (const perm of staffPermissions) {
    await prisma.permission.upsert({
      where: {
        unique_permission: {
          resource_id: "",   // ← must be empty string, not null
          action:      perm.action,
          module:      perm.module,
        },
      },
      update: { name: perm.name, active: true },
      create: {
        name:        perm.name,
        module:      perm.module,
        action:      perm.action,
        resource_id: "",     // ← must be empty string, not null
        active:      true,
      },
    });
  }

  // Upsert staff roles
  for (const roleDef of staffRoles) {
    await prisma.role.upsert({
      where:  { name: roleDef.name },
      update: { description: roleDef.description, active: true, built_in: true },
      create: {
        name:        roleDef.name,
        description: roleDef.description,
        active:      true,
        built_in:    true,
        scope:       "global",
      },
    });

    // Link permissions to role
    for (const permName of roleDef.permissions) {
      const permission = await prisma.permission.findFirst({
        where: { name: permName },
      });

      if (!permission) {
        console.warn(`    ⚠ Permission not found: ${permName} — skipping`);
        continue;
      }

      const exists = await prisma.permissionRole.findFirst({
        where: { role_name: roleDef.name, permission_id: permission.id },
      });

      if (!exists) {
        await prisma.permissionRole.create({
          data: { role_name: roleDef.name, permission_id: permission.id, active: true },
        });
      }
    }
  }

  console.log("✓ Staff roles & permissions");
}

// ─────────────────────────────────────────────────────────────
// 5. SUPER ADMIN USER
// ─────────────────────────────────────────────────────────────
async function seedSuperAdminUser() {
  const superAdminPermission = await prisma.permission.findFirst({
    where: { name: PERMISSIONS.SUPER_ADMIN },
  });

  if (!superAdminPermission) {
    console.warn("⚠ Super-admin permission not found — skipping user seed");
    return;
  }

  try {
    const superAdmin = await prisma.user.upsert({
      where:  { email: "super.admin@yopmail.com" },
      update: { first_name: "Super", last_name: "Admin" },
      create: {
        first_name: "Super",
        last_name:  "Admin",
        email:      "super.admin@yopmail.com",
        password:   bcrypt.hashSync("Admin123@pub", 10),
        username:   "superadmin",
        claims: {
          create: {
            permission_id: superAdminPermission.id,
            type:          "PERMISSION",
            active:        true,
            tenant_slug:   "iwacumo",
          },
        },
      },
    });

    console.log("✓ Super admin user");
    return superAdmin;
  } catch (err) {
    console.error("⚠ Super admin user seed error:", err);
  }
}

// ─────────────────────────────────────────────────────────────
// 6. DEFAULT PUBLISHER (Iwacumo house account)
// ─────────────────────────────────────────────────────────────
async function seedDefaultPublisher() {
  const iwacumoTenant = await prisma.tenant.findUnique({ where: { slug: "iwacumo" } });
  const superAdmin  = await prisma.user.findUnique({ where: { email: "super.admin@yopmail.com" } });

  if (!iwacumoTenant || !superAdmin) {
    console.warn("⚠ Tenant or super admin not found — skipping publisher seed");
    return;
  }

  const existingByTenant = await prisma.publisher.findUnique({ where: { tenant_id: iwacumoTenant.id } });
  const existingByUser   = await prisma.publisher.findUnique({ where: { user_id:   superAdmin.id  } });

  if (!existingByTenant && !existingByUser) {
    await prisma.publisher.create({
      data: { user_id: superAdmin.id, tenant_id: iwacumoTenant.id, slug: "iwacumo" },
    });
  } else if (existingByUser && existingByUser.tenant_id !== iwacumoTenant.id && !existingByTenant) {
    await prisma.publisher.update({
      where: { user_id: superAdmin.id },
      data:  { tenant_id: iwacumoTenant.id },
    });
  }

  console.log("✓ Default publisher (Iwacumo)");
}

// ─────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────
async function main() {
  parseArgs(config); // keeps CLI arg parsing without breaking anything

  console.log("\n🌱 Seeding database...\n");

  await seedCategories();
  await seedTenants();
  await seedCorePermissionsAndRoles();
  await seedStaffRolesAndPermissions();
  await seedSuperAdminUser();
  await seedDefaultPublisher();

  console.log("\n✅ All done.\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });