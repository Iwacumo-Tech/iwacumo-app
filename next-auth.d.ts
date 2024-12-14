import { Permission, Role } from "@prisma/client";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    first_name: string;
    email: string;
  }

  interface Session extends DefaultSession {
    user: User;
    permissions: Permission[];
    roles: Role[];
  }
}
