import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { publicProcedure } from "@/server/trpc";
import { assignRoleSchema, createRoleSchema, createUserSchema, deleteUserSchema, editProfileSchema } from "@/server/dtos";

export const createUser = publicProcedure.input(createUserSchema).mutation(async (opts)=>{
  const user = await prisma.user.create({
    data: {
      username: opts.input.username,
      email: opts.input.email ?? "",
      password: bcrypt.hashSync(opts.input.password as string, 10),
      phone_number: opts.input.phone_number ?? "",
      first_name: opts.input.first_name ?? "",
      date_of_birth: opts.input.date_of_birth ?? new Date,
      created_at: new Date(),
      last_name: opts.input.last_name ?? "",

    }
  });

  if (opts.input.roleName === "Customer") {
    return await prisma.customer.create({
      data: {
        name: opts.input.name ?? "",
        author_id: opts.input.author_id ?? "",
        publisher_id: opts.input.publisher_id ?? "",
        user_id: user.id

      },
    });
  }

  if (opts.input.roleName === "Publisher") {
    return await prisma.publisher.create({
      data: {
        custom_domain: opts.input.custom_domain ?? "",
        user_id: user.id,

      }
    });
  }

  if (opts.input.roleName === "Author") {
    return await prisma.author.create({
      data: {
        name: opts.input.name ?? "",
        user_id: user.id,
        publisher_id: opts.input.publisher_id,

      }
    });
  }
});

export const updateUser = publicProcedure.input(createUserSchema).mutation(async (opts)=>{
  return await prisma.user.update({
    where: { id: opts.input.id },
    include: { claims: true },
    data: {
      email: opts.input.email,
      phone_number: opts.input.phone_number,
      username: opts.input.username,
      active: true,
      password: bcrypt.hashSync(opts.input.password as string, 10) ?? ""
    },

  });
});

export const deleteUser = publicProcedure.input(deleteUserSchema).mutation(async (opts)=>{
  return await prisma.user.update({
    where: { id: opts.input.id },
    data: { deleted_at: new Date() },
  });
});

export const getAllUsers = publicProcedure.query(async ()=>{
  return await prisma.user.findMany({ where: { deleted_at: null } });
});

export const getAllRoles = publicProcedure.query(async ()=>{
  return await prisma.role.findMany({ where: { active: true } });
});

export const createRole = publicProcedure.input(createRoleSchema).mutation(async (opts) => {
  const { name, active, built_in, permissionIds } = opts.input;

  const role = await prisma.role.create({
    data: {
      name,
      active,
      built_in,
    },
  });

  if (permissionIds && permissionIds.length > 0) {
    const permissionRoles = permissionIds.map((permissionId) => ({
      role_name: role.name,
      permission_id: permissionId,
      active: true,
    }));

    await prisma.permissionRole.createMany({ data: permissionRoles });
  }

  return role;
});

export const assignRoleToUser = publicProcedure.input(assignRoleSchema).mutation(async (opts) => {
  const { user_id, role_name } = opts.input;

  await prisma.claim.deleteMany({
    where: {
      user_id,
      role_name: { not: null },
    },
  });

  const newClaim = await prisma.claim.create({
    data: {
      user_id,
      role_name,
      active: true,
      type: "ROLE"
    },
  });

  return newClaim;
});

export const getUserById = publicProcedure.input(deleteUserSchema).query(async (opts) => {
  return await prisma.user.findUnique({
    where: {
      id: opts.input.id,
      deleted_at: null,
    },
    include: { author: true, publisher: true, claims: true, customer: true }
  });
});

export const updateUserProfile = publicProcedure.input(editProfileSchema).mutation(async (opts)=>{
  const user = await prisma.user.findUnique({
    where: { id: opts.input.id },
    include: { publisher: true, author: true },

  });

  if(user?.author) {
    await prisma.author.update({
      where: { id: user.author.id },
      data: {
        profile_picture: opts.input.profilePicture ?? user.author.profile_picture,
        bio: opts.input.bio ?? user.author.bio,
      },
    });
  }

  if(user?.publisher) {
    await prisma.publisher.update({
      where: { id: user.publisher.id },
      data: {
        profile_picture: opts.input.profilePicture ?? user.publisher.profile_picture,
        bio: opts.input.bio
      },
    });
  }

  return user;
});
