import CredentialsProvider from "next-auth/providers/credentials";
import NextAuth from "next-auth";
import { compare } from "bcryptjs";
import { Permission, Role } from "@prisma/client";
import prisma from "@/lib/prisma";

export const { handlers, auth } = NextAuth({
  trustHost: true,
  providers: [
    CredentialsProvider({
      id: "credentials",
      credentials: {
        username: { label: "Username", type: "text", placeholder: "jsmith" },
        password: { label: "Password", type: "password" },
      },
      async authorize ({ username, password }) {
        try {
          if (!password) return null;

          const user = await prisma.user.findFirst({ where: { OR: [{ email: username as string }, { username: username as string }] } });

          if (!user || !user.active) return null;
          if (!(await compare(password as string, user.password))) return null;

          return user;
        } catch (error) {
          console.error(error);

          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt ({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.name = user.first_name;
        token.email = user.email;
      }

      return token;
    },
    async session ({ session, token }) {
      return {
        ...session,
        user: {
          id: token.sub,
          first_name: token.name as string,
          email: token.email,
        },
        ...(token?.sub ? await getUserClaims(token.sub) : {}),
      };
    },
  },
});

async function getUserClaims (userId: string): Promise<{
  permissions: Permission[];
  roles: Role[];
}> {
  const permissions = new Set<Permission>();
  const roles = new Set<Role>();

  const claims = await prisma.claim.findMany({
    where: { user_id: userId, active: true },
    include: { permission: true, role: true },
  });

  claims.forEach(({ role, permission, tenant_slug }) => {
    if (permission?.active) permissions.add({ ...permission, resource_id: tenant_slug as string });
    if (role) roles.add(role);
  });

  const rolePermissions = await prisma.permissionRole.findMany({
    where: {
      active: true,
      role_name: { in: [...roles].map(({ name }) => name) },
      permission_id: { notIn: [...permissions].map(({ id }) => id) },
    },
    include: { permission: true },
  });

  rolePermissions.forEach(({ permission }) => permissions.add(permission));

  return {
    permissions: [...permissions],
    roles: [...roles],
  };
}
