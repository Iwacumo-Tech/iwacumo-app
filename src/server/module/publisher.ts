import prisma from "@/lib/prisma";
import { createPublisherSchema, updatePublisherSchema, deletePublisherSchema, getPublisherByOrgSchema } from "@/server/dtos";
import { publicProcedure } from "@/server/trpc";
import bcrypt from "bcryptjs";


export const createPublisher = publicProcedure
  .input(createPublisherSchema)
  .mutation(async (opts) => {
    const {
      username,
      email,
      password,
      phone_number,
      first_name,
      last_name,
      date_of_birth,
      bio,
      custom_domain,
      profile_picture,
      tenant_id,
      slug,
    } = opts.input;

    // Retrieve tenant to check if it exists and get its slug
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenant_id },
    });

    if (!tenant) {
      throw new Error("Tenant not found");
    }

    const tenantSlug = tenant.slug; // Extract the tenant's slug

    // Create the user
    const user = await prisma.user.create({
      data: {
        username,
        email: email ?? "",
        password: bcrypt.hashSync(password, 10),
        phone_number: phone_number ?? "",
        first_name: first_name ?? "",
        last_name: last_name ?? "",
        date_of_birth: date_of_birth ?? new Date(),
        created_at: new Date(),
      },
    });

    // Ensure the "Publisher" role exists
    const publisherRole = await prisma.role.findUnique({
      where: { name: "publisher" },
    });

    if (!publisherRole) {
      throw new Error('Default "Publisher" role not found');
    }

    // Assign the "Publisher" role to the user by creating a Claim with tenant_slug
    await prisma.claim.create({
      data: {
        user_id: user.id,
        role_name: publisherRole.name,
        active: true,
        type: "ROLE",
        tenant_slug: tenantSlug, // Set the tenant_slug field in the claim
      },
    });

    // Retrieve and assign the permissions associated with the "Publisher" role
    const permissions = await prisma.permissionRole.findMany({
      where: {
        role_name: publisherRole.name, // Retrieve permissions associated with the "Publisher" role
      },
      include: {
        permission: true, // Include the permission details
      },
    });

    // Assign permissions to the user (by creating claims for each permission with tenant_slug)
    for (const permissionRole of permissions) {
      await prisma.claim.create({
        data: {
          user_id: user.id,
          permission_id: permissionRole.permission.id,
          active: true,
          type: "PERMISSION",
          tenant_slug: tenantSlug, // Set the tenant_slug field in the permission claim
        },
      });
    }

    // Create the publisher associated with the newly created user
    return await prisma.publisher.create({
      data: {
        bio: bio ?? null,
        custom_domain: custom_domain ?? null,
        profile_picture: profile_picture ?? null,
        slug: slug ?? "",
        tenant: {
          connect: {
            id: tenant_id,
          },
        },
        user: {
          connect: {
            id: user.id,
          },
        },
      },
    });
  });


export const updatePublisher = publicProcedure
  .input(updatePublisherSchema) 
  .mutation(async (opts) => {
    const { id, bio, custom_domain, profile_picture, slug } = opts.input;

    return await prisma.publisher.update({
      where: { id },
      data: {
        bio: bio ?? null,
        custom_domain: custom_domain ?? null,
        profile_picture: profile_picture ?? null,
        slug: slug ?? "",
      },
    });
  });

export const deletePublisher = publicProcedure
  .input(deletePublisherSchema)
  .mutation(async (opts) => {
    const { id } = opts.input;

    return await prisma.publisher.update({
      where: { id },
      data: {
        deleted_at: new Date(),
      },
    });
  });

export const getAllPublisher = publicProcedure.query(async () => {
  return await prisma.publisher.findMany({
    where: { deleted_at: null },
    include: { tenant: true, user: true },
  });
});

export const getPublisherByOrganization = publicProcedure.input(getPublisherByOrgSchema).query(async (opts) => {
  return await prisma.publisher.findMany({
    where: {
      tenant : {
        name: opts.input.name,
      },
      deleted_at: null,
    },
      include: { tenant: true, user: true },
  });
});

