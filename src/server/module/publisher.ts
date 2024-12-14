import { PERMISSIONS } from "@/lib/constants";
import prisma from "@/lib/prisma";
import { createPublisherSchema, deletePublisherSchema } from "@/server/dtos";
import { publicProcedure } from "@/server/trpc";
import bcrypt from "bcryptjs";

export const createPublisher = publicProcedure.input(createPublisherSchema).mutation(async (opts) => {
  const user = await prisma.user.create({
    data: {
      email: opts.input.email ?? "",
      password: bcrypt.hashSync(opts.input.password!, 10),
      phone_number: opts.input.phone_number ?? "",
      first_name: opts.input.first_name ?? "",
      last_name: opts.input.last_name ?? "",
    }
  });

  const tenant = await prisma.tenant.create({
    data: {
      name: opts.input.org_name,
      slug: opts.input.org_slug ?? "",
      contact_email: opts.input.contact_email ?? "",
    },
  });

  const publisher = await prisma.publisher.create({
    data: {
      user_id: user.id,
      tenant_id: tenant.id,
      slug: opts.input.slug
    },
  });

  const ownerPermission = await prisma.permission.findFirstOrThrow({ where: { name: PERMISSIONS.OWNER } });
  const publisherPermission = await prisma.permission.findFirstOrThrow({ where: { name: PERMISSIONS.PUBLISHER } });

  await prisma.claim.createMany({
    data: [
      {
        user_id: user.id,
        permission_id: ownerPermission.id,
        tenant_slug: tenant.slug,
        type: "PERMISSION",
        active: true,
      },
      {
        user_id: user.id,
        permission_id: publisherPermission.id,
        tenant_slug: tenant.slug,
        type: "PERMISSION",
        active: true,
      },
    ],
  });

  return publisher;
});

export const deletePublisher = publicProcedure.input(deletePublisherSchema).mutation(async (opts) => {
  return await prisma.publisher.update({
    where: { id: opts.input.id },
    data: { deleted_at: new Date() },
  });
});

export const getAllPublisher =  publicProcedure.query(async () => {
  return await prisma.publisher.findMany({ where: { deleted_at: null } });
});
