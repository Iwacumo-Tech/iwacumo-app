import prisma from "@/lib/prisma";
import { createPublisherSchema, updatePublisherSchema, deletePublisherSchema } from "@/server/dtos";
import { publicProcedure } from "@/server/trpc";

export const createPublisher = publicProcedure
  .input(createPublisherSchema) // Define your input schema in `dtos`
  .mutation(async (opts) => {
    const { bio, custom_domain, profile_picture,  tenant_id, user_id, slug } = opts.input;

    // Ensure the tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenant_id },
    });

    if (!tenant) {
      throw new Error("Tenant not found");
    }

    // Ensure the user exists
    const user = await prisma.user.findUnique({
      where: { id: user_id },
    });

    if (!user) {
      throw new Error("User not found");
    }

    return await prisma.publisher.create({
      data: {
        bio: bio ?? null,
        custom_domain: custom_domain ?? null,
        profile_picture: profile_picture ?? null,
        slug: slug ?? "",
        tenant: {
          connect: {
            id: tenant_id, // Connect the publisher to the existing tenant
          },
        },
        user: {
          connect: {
            id: user_id, // Connect the publisher to the existing user
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

