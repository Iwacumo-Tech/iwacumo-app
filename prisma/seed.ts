import * as fs from "fs/promises";
import { ParseArgsConfig } from "util";
import { PrismaClient, Role } from "@prisma/client";
import { parseArgs } from "node:util";
import { PERMISSIONS } from "@/lib/constants";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const config: ParseArgsConfig = { options: { environment: { type: "string" } } };

export const permissions = [
  {
    name: PERMISSIONS.SUPER_ADMIN,
    module: "super-admin",
  },
  {
    name: PERMISSIONS.PUBLISHER,
    module: "publisher",
  },
  {
    name: PERMISSIONS.AUTHOR,
    module: "author",
  },
  {
    name: PERMISSIONS.CUSTOMER,
    module: "customer",
  },
  {
    name: PERMISSIONS.OWNER,
    module: "owner",
  }
];

async function seedTenants () {
  const booka = {
    name: "Booka",
    custom_domain: "https://booka.ng",
    slug: "booka",
    contact_email: "booka@yopmail.com",
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

  await Promise.all(
    permissions.map(async (permission) => {
      const existingPermission = await prisma.permission.findFirst({
        where: {
          name: permission.name,
          action: permission.name,  // I assume `action` is same as `name` from your current logic.
          module: permission.module,
        },
      });

      // If the permission does not exist, create it
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

  console.log("Tenant seeding complete");
}

async function seedUsers () {
  const super_admin = {
    first_name: "Super",
    last_name: "Admin",
    email: "super.admin@yopmail.com",
    password: "secret",
  };

  const publisherPermission = await prisma.permission.findFirstOrThrow({
    where: {
      name: PERMISSIONS.PUBLISHER,
      action: PERMISSIONS.PUBLISHER,
      module: "publisher",
    },
  });

  const ownerPermission = await prisma.permission.findFirstOrThrow({
    where: {
      name: PERMISSIONS.OWNER,
      action: PERMISSIONS.OWNER,
      module: "owner",
    },
  });

  const superAdminPermission = await prisma.permission.findFirstOrThrow({
    where: {
      name: PERMISSIONS.SUPER_ADMIN,
      action: PERMISSIONS.SUPER_ADMIN,
      module: "super-admin",
    },
  });

  try {
    const superAdmin = await prisma.user.upsert({
      where: { email: super_admin.email },
      update: {
        first_name: super_admin.first_name,
        last_name: super_admin.last_name,
        claims: {
          createMany: {
            data: [
              {
                permission_id: superAdminPermission.id,
                type: "PERMISSION",
                active: true,
                tenant_slug: "booka",
              },
              {
                permission_id: ownerPermission.id,
                type: "PERMISSION",
                active: true,
                tenant_slug: "booka",
              },
              {
                permission_id: publisherPermission.id,
                type: "PERMISSION",
                active: true,
                tenant_slug: "booka",
              },
            ],
            skipDuplicates: true,
          },
        },
      },
      create: {
        ...super_admin,
        password: bcrypt.hashSync(super_admin.password, 10),
        claims: {
          createMany: {
            data: [
              {
                permission_id: ownerPermission.id,
                type: "PERMISSION",
                active: true,
                tenant_slug: "booka",
              },
              {
                permission_id: publisherPermission.id,
                type: "PERMISSION",
                active: true,
                tenant_slug: "booka",
              },
              {
                permission_id: superAdminPermission.id,
                type: "PERMISSION",
                active: true,
                tenant_slug: "booka",
              },
            ]
          }
        },
      },
    });

    const bookaTenant = await prisma.tenant.findUnique({ where: {  slug: "booka" } });

    await prisma.publisher.create({
      data: {
        user_id: superAdmin.id,
        tenant_id: bookaTenant?.id
      }
    });
  } catch (err) {
    console.log("seed user error: ", err);
  }

  console.log("Users seeding complete");
}

async function seedPermissionsAndRoles () {
  const rolesJson = JSON.parse(
    await fs.readFile("./prisma/seed-data/roles.json", "utf-8")
  ) as Role[];

  for (const { name, active, built_in } of rolesJson) {
    await prisma.role.upsert({
      where: { name },
      update: { active },
      create: {
        name,
        built_in,
        active: true,
      },
    });

    const permission = await prisma.permission.findFirst({ where: { name } });

    if (permission) {
      await prisma.permissionRole.upsert({
        where: { id: permission.id },
        update: { active: true },
        create: {
          role_name: name,
          permission_id: permission.id,
          active: true,
        },
      });
    } else {
      console.warn(`Permission with name ${name} not found.`);
    }
  }

  console.log("Roles seeding complete");
}

async function seedDev () {
  try {
    await seedTenants();
    await seedPermissionsAndRoles();
    await seedUsers();
  } catch (error) {
    console.error("Error seeding data:", error);
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * NOTE
 * ⚠️ Only modify this if you know what you are doing
 * -------------------------------------------------
 * This should be idempotent so that it can be ran in production
 * without modifying already existing records.
 */
async function seedProd () {
  try {
    await seedTenants();
    await seedPermissionsAndRoles();
    await seedUsers();
  } catch (error) {
    console.error("Error seeding data:", error);
  } finally {
    await prisma.$disconnect();
  }
}

async function main () {
  const { values: { environment } } = parseArgs(config);

  if (environment?.toString()?.toLocaleLowerCase()
    ?.includes("prod")) {
    await seedProd();

    return;
  }

  await seedDev();
}

main();
