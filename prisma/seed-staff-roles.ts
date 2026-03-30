import { PrismaClient } from "@prisma/client";
 
const prisma = new PrismaClient();
 
// ── Permission definitions ────────────────────────────────────
// Each permission maps to a specific capability in the dashboard.
// module + action + name must be unique (see schema @@unique).
 
const PERMISSIONS = [
  // Dashboard
  { name: "view_dashboard",       module: "dashboard",  action: "read"   },
 
  // Books
  { name: "view_books",           module: "books",      action: "read"   },
  { name: "manage_books",         module: "books",      action: "write"  },
  { name: "approve_books",        module: "books",      action: "approve"},
  { name: "feature_books",        module: "books",      action: "feature"},
 
  // Authors
  { name: "view_authors",         module: "authors",    action: "read"   },
  { name: "manage_authors",       module: "authors",    action: "write"  },
 
  // Publishers
  { name: "view_publishers",      module: "publishers", action: "read"   },
  { name: "manage_publishers",    module: "publishers", action: "write"  },
  { name: "manage_whitelabel",    module: "publishers", action: "whitelabel"},
 
  // Orders & Customers
  { name: "view_orders",          module: "orders",     action: "read"   },
  { name: "view_customers",       module: "customers",  action: "read"   },
 
  // Admin/Staff
  { name: "manage_staff",         module: "admin",      action: "write"  },
 
  // Settings
  { name: "manage_settings",      module: "settings",   action: "write"  },
 
  // Full access
  { name: "super_access",         module: "platform",   action: "all"    },
];
 
// ── Role definitions ──────────────────────────────────────────
// Each role has a name, description, and the permission names it grants.
 
const ROLES: {
  name: string;
  description: string;
  permissions: string[];
}[] = [
  {
    name: "staff-basic",
    description: "View-only access to dashboard, books, orders and customers",
    permissions: [
      "view_dashboard",
      "view_books",
      "view_orders",
      "view_customers",
      "view_authors",
      "view_publishers",
    ],
  },
  {
    name: "staff-content",
    description: "Can add/edit authors, submit and approve books for publishing",
    permissions: [
      "view_dashboard",
      "view_books",
      "manage_books",
      "approve_books",
      "view_orders",
      "view_customers",
      "view_authors",
      "manage_authors",
      "view_publishers",
    ],
  },
  {
    name: "staff-publisher",
    description: "Can manage publishers, authors, whitelabel stores and books",
    permissions: [
      "view_dashboard",
      "view_books",
      "manage_books",
      "approve_books",
      "feature_books",
      "view_orders",
      "view_customers",
      "view_authors",
      "manage_authors",
      "view_publishers",
      "manage_publishers",
      "manage_whitelabel",
    ],
  },
  {
    name: "staff-finance",
    description: "Can view platform stats and manage system settings",
    permissions: [
      "view_dashboard",
      "view_orders",
      "view_customers",
      "view_books",
      "view_authors",
      "view_publishers",
      "manage_settings",
    ],
  },
  {
    name: "super-admin",
    description: "Full platform access — all permissions",
    permissions: PERMISSIONS.map((p) => p.name),
  },
];
 
async function main() {
  console.log("🌱 Seeding staff roles and permissions...\n");
 
  // 1. Upsert all permissions
  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: {
        unique_permission: {
          resource_id: '',
          action: perm.action,
          module: perm.module,
        },
      },
      update: { name: perm.name, active: true },
      create: {
        name: perm.name,
        module: perm.module,
        action: perm.action,
        resource_id: '',
        active: true,
      },
    });
    console.log(`  ✓ Permission: ${perm.name}`);
  }
 
  // 2. Upsert all roles
  for (const roleDef of ROLES) {
    await prisma.role.upsert({
      where: { name: roleDef.name },
      update: { description: roleDef.description, active: true, built_in: true },
      create: {
        name: roleDef.name,
        description: roleDef.description,
        active: true,
        built_in: true,
        scope: "global",
      },
    });
    console.log(`  ✓ Role: ${roleDef.name}`);
 
    // 3. Link permissions to this role
    for (const permName of roleDef.permissions) {
      const permission = await prisma.permission.findFirst({
        where: { name: permName },
      });
 
      if (!permission) {
        console.warn(`    ⚠ Permission not found: ${permName} — skipping`);
        continue;
      }
 
      // Check if link already exists
      const existing = await prisma.permissionRole.findFirst({
        where: { role_name: roleDef.name, permission_id: permission.id },
      });
 
      if (!existing) {
        await prisma.permissionRole.create({
          data: {
            role_name: roleDef.name,
            permission_id: permission.id,
            active: true,
          },
        });
      }
      console.log(`    → ${permName}`);
    }
  }
 
  console.log("\n✅ Staff roles seeded successfully.");
}
 
main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });