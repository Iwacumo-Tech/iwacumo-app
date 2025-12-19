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
      tenant_name,
      slug,
    } = opts.input;

    const publisher = await prisma.$transaction(async (tx) => {
      // Resolve tenant: use provided id or create new from name
      let tenantSlug: string | null = null;
      let resolvedTenantId: string;

      const toSlug = (name: string) =>
        name
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-");

      if (tenant_name && !tenant_id) {
        // Create a unique slug based on tenant_name
        const baseSlug = toSlug(tenant_name);
        let candidate = baseSlug || `org-${Date.now()}`;
        let suffix = 1;
        // ensure uniqueness
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const existing = await tx.tenant.findUnique({ where: { slug: candidate } });
          if (!existing) break;
          candidate = `${baseSlug}-${suffix++}`;
        }
        const createdTenant = await tx.tenant.create({
          data: {
            name: tenant_name,
            slug: candidate,
          },
        });
        resolvedTenantId = createdTenant.id;
        tenantSlug = createdTenant.slug ?? null;
      } else {
        // Retrieve tenant to check if it exists and get its slug
        const tenant = await tx.tenant.findUnique({
          where: { id: tenant_id! },
        });
        if (!tenant) {
          throw new Error("Tenant not found");
        }
        resolvedTenantId = tenant.id;
        tenantSlug = tenant.slug ?? null;
      }

      // Create the user
      const user = await tx.user.create({
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
      const publisherRole = await tx.role.findUnique({
        where: { name: "publisher" },
      });

      if (!publisherRole) {
        throw new Error('Default "Publisher" role not found');
      }

      // Assign the "Publisher" role to the user by creating a Claim with tenant_slug
      await tx.claim.create({
        data: {
          user_id: user.id,
          role_name: publisherRole.name,
          active: true,
          type: "ROLE",
          tenant_slug: tenantSlug,
        },
      });

      // Retrieve and assign the permissions associated with the "Publisher" role
      const permissions = await tx.permissionRole.findMany({
        where: { role_name: publisherRole.name },
        include: { permission: true },
      });

      // Assign permissions to the user (by creating claims for each permission with tenant_slug)
      const uniquePermissionIds = Array.from(
        new Set(permissions.map((pr) => pr.permission.id))
      );

      if (uniquePermissionIds.length > 0) {
        await tx.claim.createMany({
          data: uniquePermissionIds.map((permissionId) => ({
            user_id: user.id,
            permission_id: permissionId,
            active: true,
            type: "PERMISSION",
            tenant_slug: tenantSlug,
          })),
          skipDuplicates: true,
        });
      }

      // Create the publisher associated with the newly created user
      const createdPublisher = await tx.publisher.create({
        data: {
          bio: bio ?? null,
          custom_domain: custom_domain ?? null,
          profile_picture: profile_picture ?? null,
          slug: slug ?? "",
          tenant: {
            connect: { id: resolvedTenantId },
          },
          user: {
            connect: { id: user.id },
          },
        },
      });

      return createdPublisher;
    });

    return publisher;
  });


export const updatePublisher = publicProcedure
  .input(updatePublisherSchema) 
  .mutation(async (opts) => {
    const { id, bio, custom_domain, profile_picture, slug, tenant_id } = opts.input;

    return await prisma.publisher.update({
      where: { id },
      data: {
        bio: bio ?? null,
        custom_domain: custom_domain ?? null,
        profile_picture: profile_picture ?? null,
        slug: slug ?? null,
        tenant_id: tenant_id ?? null,
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

