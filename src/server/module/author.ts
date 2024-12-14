import prisma from "@/lib/prisma";
import { createAuthorSchema, deleteAuthorSchema, findBookByIdSchema, signUpAuthorSchema } from "@/server/dtos";
import { publicProcedure } from "@/server/trpc";
import { auth } from "@/auth";
import bcrypt from "bcryptjs";
import { PERMISSIONS } from "@/lib/constants";

export const createAuthor = publicProcedure.input(createAuthorSchema).mutation(async (opts) => {
  const session = await auth();

  if(!session) {
    console.error("User session not found");

    return;
  }

  const user = await prisma.user.create({
    data: {
      username: opts.input.username,
      email: opts.input.email ?? "",
      password: bcrypt.hashSync(opts.input.password!, 10),
      phone_number: opts.input.phone_number ?? "",
      first_name: opts.input.first_name ?? "",
      last_name: opts.input.last_name ?? "",
    }
  });

  const creator = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { publisher: true, claims: { include: { permission: true } } }
  });

  const slug = creator?.claims.find((claim) => claim.permission?.name === PERMISSIONS.PUBLISHER)?.tenant_slug;
  const authorPermission = await prisma.permission.findFirst({ where: { name: PERMISSIONS.AUTHOR } });

  await prisma.claim.create({
    data: {
      user_id: user.id,
      permission_id: authorPermission?.id,
      type: "PERMISSION",
      active: true,
      tenant_slug: slug,
    }
  });

  return await prisma.author.create({
    data: {
      user_id: user.id,
      publisher_id: creator?.publisher?.id,

    },
  });
});

export const deleteAuthor = publicProcedure.input(deleteAuthorSchema).mutation(async (opts) => {
  return await prisma.author.update({
    where: { id: opts.input.id },
    data: { deleted_at: new Date() },
  });
});

export const getAllAuthors =  publicProcedure.query(async () => {
  return await prisma.author.findMany({ where: { deleted_at: null }, include: { user: true } });
});

export const signUpAuthor = publicProcedure.input(signUpAuthorSchema).mutation(async (opts) => {
  const user = await prisma.user.create({
    data: {
      email: opts.input.email ?? "",
      password: bcrypt.hashSync(opts.input.password!, 10),
      phone_number: opts.input.phone_number ?? "",
      first_name: opts.input.first_name ?? "",
      last_name: opts.input.last_name ?? "",
    }
  });

  const tenant = await prisma.tenant.findFirstOrThrow({
    where: { slug: "booka" },
    include: { publishers: true }
  });

  if(!tenant) {
    return;
  }

  const publisher = await prisma.author.create({
    data: {
      user_id: user.id,
      publisher_id: tenant.publishers?.id,
      slug: opts.input.slug
    },
  });

  const authorPermission = await prisma.permission.findFirstOrThrow({ where: { name: PERMISSIONS.AUTHOR } });

  await prisma.claim.createMany({
    data: [
      {
        user_id: user.id,
        permission_id: authorPermission.id,
        tenant_slug: tenant.slug,
        type: "PERMISSION",
        active: true,
      },
    ],
  });

  return publisher;
});

export const getAuthorsByUser = publicProcedure.input(findBookByIdSchema).query(async (opts) => {
  const user = await prisma.user.findUnique({
    where: { id: opts.input.id },
    include: { author: true, publisher: true }
  });

  if(user && user.publisher) {
    return await prisma.author.findMany({
      where: { publisher_id: user.publisher.id, deleted_at: null },
      include: { books: true, user: true }
    });
  }

  if(user && user.author) {
    return await prisma.author.findMany({
      where: { id: user.author.id, deleted_at: null },
      include: { books: true, user: true }
    });
  }
});

export const getAuthorBySlug = publicProcedure.input(findBookByIdSchema).query(async (opts) => {
  const author = await prisma.author.findUnique({
    where: { slug: opts.input.id },
    include: { user: true, publisher: true, books: true }
  });

  return author;
});
